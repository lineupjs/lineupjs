import {computeHist, computeStats} from '../internal';
import Column, {
  defaultGroup, ICategoricalColumn, IColumnDesc, IDataRow, IGroup, INumberColumn,
  IOrderedGroup, ICompareValue,
  NumberColumn,
  IndicesArray,
  mapIndices
} from '../model';
import Ranking from '../model/Ranking';
import ACommonDataProvider from './ACommonDataProvider';
import {IDataProviderOptions, IStatsBuilder} from './interfaces';
import {ISortWorker, sortComplex, chooseByLength, local, normalizeCompareValues} from './sort';
import {range} from 'd3-array';
import ADataProvider from './ADataProvider';


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
  rows: {i: number, sort?: ICompareValue[]}[];
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
  private sortWorker: ISortWorker = local; // new WorkerSortWorker();

  constructor(private _data: any[], columns: IColumnDesc[] = [], options: Partial<ILocalDataProviderOptions & IDataProviderOptions> = {}) {
    super(columns, options);
    Object.assign(this.options, options);
    this._dataRows = toRows(_data);


    const that = this;
    this.reorderAll = function (this: {source: Ranking}) {
      //fire for all other rankings a dirty order event, too
      const ranking = this.source;
      that.getRankings().forEach((r) => {
        if (r !== ranking) {
          r.dirtyOrder();
        }
      });
    };
  }

  /**
   * set a globally applied filter to all data without changing the data source itself
   * @param {((row: IDataRow) => boolean) | null} filter
   */
  setFilter(filter: ((row: IDataRow) => boolean) | null) {
    this.filter = filter;
    this.reorderAll();
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
    this.reorderAll();
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
    this.reorderAll();
  }

  cloneRanking(existing?: Ranking) {
    const clone = super.cloneRanking(existing);

    if (this.options.filterGlobally) {
      clone.on(`${NumberColumn.EVENT_FILTER_CHANGED}.reorderAll`, this.reorderAll);
    }

    return clone;
  }

  cleanUpRanking(ranking: Ranking) {
    if (this.options.filterGlobally) {
      ranking.on(`${NumberColumn.EVENT_FILTER_CHANGED}.reorderAll`, null);
    }
    super.cleanUpRanking(ranking);
  }

  sortImpl(ranking: Ranking): IOrderedGroup[] | Promise<IOrderedGroup[]> {
    if (this._data.length === 0) {
      return [];
    }
    //do the optional filtering step
    let filter: ((d: IDataRow) => boolean) | null = null;
    let rankFilter: ((d: IDataRow, rank: number, relativeRank: number, group: IGroup) => boolean) | null = null;

    if (this.options.filterGlobally) {
      const filtered = this.getRankings().filter((d) => d.isFiltered());
      if (filtered.length === 1) {
        rankFilter = filtered[0].filter.bind(filtered[0]);
      } else if (filtered.length > 1) {
        filter = (d: IDataRow) => filtered.every((f) => f.filter(d));
      }
      const filteredRank = this.getRankings().filter((d) => d.isFilteredRank());
      if (filteredRank.length === 1) {
        rankFilter = filteredRank[0].filterRank.bind(filteredRank[0]);
      } else if (filteredRank.length > 1) {
        rankFilter = (d: IDataRow, rank: number, relativeRank: number, group: IGroup) => filteredRank.every((f) => f.filterRank(d, rank, relativeRank, group));
      }
    } else {
      if (ranking.isFiltered()) {
        filter = ranking.filter.bind(ranking);
      }
      if (ranking.isFilteredRank()) {
        rankFilter = ranking.filterRank.bind(ranking);
      }
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
      const order = chooseByLength(this._data.length);
      order.set(range(this._data.length));
      const index2pos = order.slice();
      // TODO rank filter
      return [Object.assign({order, index2pos}, defaultGroup)];
    }

    const groups = new Map<string, ISortHelper>();

    const types = isSortedBy ? ranking.toCompareValueType() : undefined;

    for (const r of this._dataRows) {
      if (filter && !filter(r)) {
        continue;
      }
      const group = ranking.grouper(r) || defaultGroup;
      const groupKey = group.name.toLowerCase();
      const sort = isSortedBy ? normalizeCompareValues(ranking.toCompareValue(r), types!) : undefined;
      if (groups.has(groupKey)) {
        groups.get(groupKey)!.rows.push({i: r.i, sort});
      } else {
        groups.set(groupKey, {group, rows: [{i: r.i, sort}]});
      }
    }

    if (groups.size === 0) {
      return [];
    }


    return Promise.all(Array.from(groups.values()).map((g) => {
      const group = g.group;
      return this.sortWorker.sort(this._data.length, g.rows, types)
        // to group info
        .then(({order, index2pos}) => {
        const o: IOrderedGroup = Object.assign({order, index2pos}, group);

        // compute sort group value
        let sort: ICompareValue[] | null = null;
        if (isGroupedSortedBy) {
          const groupData = Object.assign({rows: Array.from(order).map((d) => this._data[d])}, group);
          sort = ranking.toGroupCompareValue(groupData);
        }
        return {o, sort};
      });
    })).then((groupHelper) => {

      // sort groups
      if (isGroupedSortedBy) {
        sortComplex(<{sort: ICompareValue[]}[]>groupHelper, ranking.toGroupCompareValueType());
      } else {
        groupHelper.sort((a, b) => a.o.name.toLowerCase().localeCompare(b.o.name.toLowerCase()));
      }

      // TODO rank fiter

      return groupHelper.map((d) => d.o);
    });
  }


  viewRaw(indices: IndicesArray) {
    //filter invalid indices
    return mapIndices(indices, (i) => this._data[i]);
  }

  viewRawRows(indices: IndicesArray) {
    //filter invalid indices
    return mapIndices(indices, (i) => this._dataRows[i]);
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
    let d: IDataRow[] | null = null;
    const getData = () => {
      if (d == null) {
        return d = indices && indices.length < this._dataRows.length ? this.viewRawRows(indices) : this._dataRows;
      }
      return d;
    };

    return {
      stats: (col: INumberColumn, numberOfBins?: number) => computeStats(getData().map((d) => col.getNumber(d)), [0, 1], numberOfBins),
      hist: (col: ICategoricalColumn) => computeHist(getData(), (d) => col.getCategory(d), col.categories)
    };
  }


  mappingSample(col: INumberColumn): number[] {
    const MAX_SAMPLE = 120; //at most 500 sample lines
    const l = this._dataRows.length;
    if (l <= MAX_SAMPLE) {
      return <number[]>this._dataRows.map(col.getRawNumber.bind(col));
    }
    //randomly select 500 elements
    const indices: number[] = [];
    for (let i = 0; i < MAX_SAMPLE; ++i) {
      let j = Math.floor(Math.random() * (l - 1));
      while (indices.indexOf(j) >= 0) {
        j = Math.floor(Math.random() * (l - 1));
      }
      indices.push(j);
    }
    return indices.map((i) => col.getRawNumber(this._dataRows[i]));
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
