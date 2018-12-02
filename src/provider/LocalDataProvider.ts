import {computeHist, computeNormalizedStats, computeDateState, IDateStatistics} from '../internal';
import Column, {
  defaultGroup, IColumnDesc, IDataRow, IGroup, INumberColumn,
  IOrderedGroup,
  IndicesArray,
  mapIndices,
  IGroupMeta,
  ISetColumn,
  IDateColumn
} from '../model';
import Ranking, {EDirtyReason} from '../model/Ranking';
import ACommonDataProvider from './ACommonDataProvider';
import {IDataProviderOptions, IStatsBuilder} from './interfaces';
import {ISortWorker, sortComplex, chooseByLength, WorkerSortWorker, CompareLookup} from './sort';
import ADataProvider from './ADataProvider';
import {ISequence, lazySeq} from '../internal/interable';


export interface ILocalDataProviderOptions {
  /**
   * whether the filter should be applied to all rankings regardless where they are
   * default: false
   */
  filterGlobally: boolean;
  /**
   * jump to search results such that they are visible
   * default: false
   */
  jumpToSearchResult: boolean;
}

interface ISortHelper {
  group: IGroup;
  rows: number[];
}

/**
 * a data provider based on an local array
 */
export default class LocalDataProvider extends ACommonDataProvider {
  private options: ILocalDataProviderOptions = {
    /**
     * whether the filter should be applied to all rankings regardless where they are
     */
    filterGlobally: false,

    jumpToSearchResult: false
  };

  private readonly reorderAll: () => void;

  private _dataRows: IDataRow[];
  private filter: ((row: IDataRow) => boolean) | null = null;
  private sortWorker: ISortWorker = new WorkerSortWorker(); //

  constructor(private _data: any[], columns: IColumnDesc[] = [], options: Partial<ILocalDataProviderOptions & IDataProviderOptions> = {}) {
    super(columns, options);
    Object.assign(this.options, options);
    this._dataRows = toRows(_data);


    const that = this;
    this.reorderAll = function (this: {source?: Ranking, type: string}) {
      //fire for all other rankings a dirty order event, too
      const ranking = this.source;
      const type = this.type;
      for (const r of that.getRankings()) {
        if (r !== ranking) {
          r.dirtyOrder(type === Ranking.EVENT_FILTER_CHANGED ? EDirtyReason.FILTER_CHANGED : undefined);
        }
      }
    };
  }

  /**
   * set a globally applied filter to all data without changing the data source itself
   * @param {((row: IDataRow) => boolean) | null} filter
   */
  setFilter(filter: ((row: IDataRow) => boolean) | null) {
    this.filter = filter;
    this.reorderAll.call({type: Ranking.EVENT_FILTER_CHANGED});
  }

  getFilter() {
    return this.filter;
  }

  getTotalNumberOfRows() {
    return this.data.length;
  }

  get data() {
    return this._data;
  }

  destroy() {
    super.destroy();
    this.sortWorker.terminate();
  }

  /**
   * replaces the dataset rows with a new one
   * @param data
   */
  setData(data: any[]) {
    this._data = data;
    this._dataRows = toRows(data);
    this.fire(ADataProvider.EVENT_DATA_CHANGED, this._dataRows);
    this.reorderAll.call({type: Ranking.EVENT_FILTER_CHANGED});
  }

  clearData() {
    this.setData([]);
  }

  /**
   * append rows to the dataset
   * @param data
   */
  appendData(data: any[]) {
    for (const d of data) {
      this._data.push(d);
      this._dataRows.push({v: d, i: this._dataRows.length});
    }
    this.fire(ADataProvider.EVENT_DATA_CHANGED, this._dataRows);
    this.reorderAll.call({type: Ranking.EVENT_FILTER_CHANGED});
  }

  cloneRanking(existing?: Ranking) {
    const clone = super.cloneRanking(existing);

    if (this.options.filterGlobally) {
      clone.on(`${Ranking.EVENT_FILTER_CHANGED}.reorderAll`, this.reorderAll);
    }

    return clone;
  }

  cleanUpRanking(ranking: Ranking) {
    if (this.options.filterGlobally) {
      ranking.on(`${Ranking.EVENT_FILTER_CHANGED}.reorderAll`, null);
    }
    super.cleanUpRanking(ranking);
  }

  sort(ranking: Ranking, _dirtyReason?: EDirtyReason) {
    if (this._data.length === 0) {
      return {groups: [], index2pos: []};
    }
    //do the optional filtering step
    let filter: ((d: IDataRow) => boolean) | null = null;

    if (this.options.filterGlobally) {
      const filtered = this.getRankings().filter((d) => d.isFiltered());
      if (filtered.length === 1) {
        filter = filtered[0].filter.bind(filtered[0]);
      } else if (filtered.length > 1) {
        filter = (d: IDataRow) => filtered.every((f) => f.filter(d));
      }
    } else if (ranking.isFiltered()) {
      filter = ranking.filter.bind(ranking);
    }

    if (this.filter) {
      // insert the extra filter
      const bak = filter;
      filter = !filter ? this.filter : (d) => this.filter!(d) && bak!(d);
    }

    const isGroupedBy = ranking.getGroupCriteria().length > 0;
    const isSortedBy = ranking.getSortCriteria().length > 0;
    const isGroupedSortedBy = ranking.getGroupSortCriteria().length > 0;

    if (!isGroupedBy && !isSortedBy && !filter) {
      // initial no sorting required just index mapping
      const l = this._data.length;
      const order = chooseByLength(l);
      const index2pos = order.slice();
      for (let i = 0; i < l; ++i) {
        order[i] = i;
        index2pos[i] = i + 1; // shift since default is 0
      }
      return {groups: [Object.assign({order}, defaultGroup)], index2pos};
    }

    const groups = new Map<string, ISortHelper>();
    const lookups = isSortedBy ? new CompareLookup(this._data.length, ranking.toCompareValueType()) : undefined;
    let maxDataIndex = -1;

    for (const r of this._dataRows) {
      if (filter && !filter(r)) {
        continue;
      }
      const group = ranking.grouper(r) || defaultGroup;
      const groupKey = group.name.toLowerCase();
      if (lookups) {
        lookups.push(r.i, ranking.toCompareValue(r));
      }
      if (groups.has(groupKey)) {
        groups.get(groupKey)!.rows.push(r.i);
      } else {
        groups.set(groupKey, {group, rows: [r.i]});
      }
      if (maxDataIndex < r.i) {
        maxDataIndex = r.i;
      }
    }

    if (groups.size === 0) {
      return {groups: [], index2pos: []};
    }

    const groupLookup = isGroupedSortedBy ? new CompareLookup(groups.size, ranking.toGroupCompareValueType()) : undefined;

    return Promise.all(Array.from(groups.values()).map((g, i) => {
      const group = g.group;
      return this.sortWorker.sort(g.rows, groups.size === 1, lookups)
        // to group info
        .then((order) => {
          const o: IOrderedGroup = Object.assign({order}, group);

          // compute sort group value
          if (groupLookup) {
            const groupData = Object.assign({rows: lazySeq(order).map((d) => this._dataRows[d]), meta: <IGroupMeta>'first last'}, group);
            groupLookup.push(i, ranking.toGroupCompareValue(groupData));
          }
          return o;
        });
    })).then((groups) => {
      // sort groups
      if (!groupLookup) {
        groups.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      } else {
        const groupIndices = groups.map((_, i) => i);
        sortComplex(groupIndices, groupLookup.sortOrders);
        groups = groupIndices.map((i) => groups[i]);
      }

      const index2pos = chooseByLength(maxDataIndex + 1);
      let offset = 1;
      for (const g of groups) {
        // tslint:disable-next-line
        for (let i = 0; i < g.order.length; i++ , offset++) {
          index2pos[g.order[i]] = offset;
        }
      }

      return {groups, index2pos};
    });
  }

  private readonly mapToDataRow = (i: number) => {
    if (i < 0 || i >= this._dataRows.length) {
      return {i, v: {}};
    }
    return this._dataRows[i];
  };


  viewRaw(indices: IndicesArray) {
    return mapIndices(indices, (i) => this._data[i] || {});
  }

  viewRawRows(indices: IndicesArray) {
    return mapIndices(indices, this.mapToDataRow);
  }

  private seqRawRows(indices: IndicesArray) {
    if (indices.length < 10000) { // small copy
      return mapIndices(indices, this.mapToDataRow);
    }
    return lazySeq(indices).map(this.mapToDataRow);
  }

  view(indices: IndicesArray) {
    return this.viewRaw(indices);
  }

  fetch(orders: IndicesArray[]): IDataRow[][] {
    return orders.map((order) => this.viewRawRows(order));
  }

  /**
   * helper for computing statistics
   * @param indices
   * @returns {{stats: (function(INumberColumn): *), hist: (function(ICategoricalColumn): *)}}
   */
  stats(indices?: IndicesArray): IStatsBuilder {
    let d: ISequence<IDataRow> | null = null;
    const getData = () => {
      if (d == null) {
        return d = indices && indices.length < this._dataRows.length ? this.seqRawRows(indices) : lazySeq(this._dataRows);
      }
      return d;
    };

    return {
      stats: (col: INumberColumn, numberOfBins?: number) => computeNormalizedStats(getData().map((d) => col.getNumber(d)), numberOfBins),
      hist: (col: ISetColumn) => computeHist(getData().map((d) => col.getSet(d)), col.categories),
      dateStats: (col: IDateColumn, template?: IDateStatistics) => computeDateState(getData().map((d) => col.getDate(d)), template)
    };
  }


  mappingSample(col: INumberColumn): ISequence<number> {
    const MAX_SAMPLE = 120; //at most 500 sample lines
    const l = this._dataRows.length;
    if (l <= MAX_SAMPLE) {
      return lazySeq(this._dataRows).map((v) => col.getRawNumber(v));
    }
    //randomly select 500 elements
    const indices = new Set<number>();

    for (let i = 0; i < MAX_SAMPLE; ++i) {
      let j = Math.floor(Math.random() * (l - 1));
      while (indices.has(j)) {
        j = Math.floor(Math.random() * (l - 1));
      }
      indices.add(j);
    }
    return lazySeq(Array.from(indices)).map((i) => col.getRawNumber(this._dataRows[i]));
  }

  searchAndJump(search: string | RegExp, col: Column) {
    //case insensitive search
    search = typeof search === 'string' ? search.toLowerCase() : search;
    const f = typeof search === 'string' ? (v: string) => v.toLowerCase().indexOf((<string>search)) >= 0 : (<RegExp>search).test.bind(search);
    const indices = <number[]>[];
    for (let i = 0; i < this._dataRows.length; ++i) {
      if (f(col.getLabel(this._dataRows[i]))) {
        indices.push(i);
      }
    }
    this.jumpToNearest(indices);
  }

}

function toRows(data: any[]) {
  return data.map((v, i) => ({v, i}));
}
