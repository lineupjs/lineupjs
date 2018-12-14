import {ISequence, lazySeq} from '../internal/interable';
import Column, {defaultGroup, IColumnDesc, ICompareValue, IDataRow, IGroup, IndicesArray, INumberColumn, IOrderedGroup, mapIndices, CompositeColumn} from '../model';
import Ranking, {EDirtyReason} from '../model/Ranking';
import ACommonDataProvider from './ACommonDataProvider';
import ADataProvider from './ADataProvider';
import {IDataProviderOptions} from './interfaces';
import {CompareLookup, ISortWorker, local, WorkerSortWorker} from './sort';
import {DirectRenderTasks, IRenderTaskExectutor, ScheduleRenderTasks} from './tasks';
import {IEventContext} from '../internal/AEventDispatcher';
import {createIndexArray, sortComplex} from '../internal';


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

  /**
   * specify the sort worker to use local = direct or webworker = run in a webworker
   */
  sortWorker: 'local' | 'webworker';

  /**
   * specify the task executor to use direct = no delay, scheduled = run when idle
   */
  taskExecutor: 'direct' | 'scheduled';
}

interface ISortHelper {
  group: IGroup;
  rows: IndicesArray;
}

/**
 * a data provider based on an local array
 */
export default class LocalDataProvider extends ACommonDataProvider {
  private readonly options: ILocalDataProviderOptions = {
    /**
     * whether the filter should be applied to all rankings regardless where they are
     */
    filterGlobally: false,

    jumpToSearchResult: false,

    sortWorker: 'local',
    taskExecutor: 'direct'
  };

  private readonly reorderAll: () => void;

  private _dataRows: IDataRow[];
  private filter: ((row: IDataRow) => boolean) | null = null;
  private readonly sortWorker: ISortWorker;
  private readonly tasks: IRenderTaskExectutor;

  constructor(private _data: any[], columns: IColumnDesc[] = [], options: Partial<ILocalDataProviderOptions & IDataProviderOptions> = {}) {
    super(columns, options);
    Object.assign(this.options, options);
    this._dataRows = toRows(_data);
    this.sortWorker = this.options.sortWorker === 'local' ? local : new WorkerSortWorker();
    this.tasks = this.options.taskExecutor === 'direct' ? new DirectRenderTasks() : new ScheduleRenderTasks();
    this.tasks.setData(this._dataRows);

    const that = this;
    this.reorderAll = function (this: {source?: Ranking, type: string}) {
      //fire for all other rankings a dirty order event, too
      const ranking = this.source;
      const type = this.type;
      for (const r of that.getRankings()) {
        if (r !== ranking) {
          r.dirtyOrder(type === Ranking.EVENT_FILTER_CHANGED ? [EDirtyReason.FILTER_CHANGED] : [EDirtyReason.UNKNOWN]);
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

  getTaskExecutor() {
    return this.tasks;
  }

  get data() {
    return this._data;
  }

  destroy() {
    super.destroy();
    this.sortWorker.terminate();
    this.tasks.setData([]);
  }

  /**
   * replaces the dataset rows with a new one
   * @param data
   */
  setData(data: any[]) {
    this._data = data;
    this._dataRows = toRows(data);
    this.dataChanged();
  }

  private dataChanged() {
    this.tasks.setData(this._dataRows);

    for (const ranking of this.getRankings()) {
      this.tasks.preComputeData(ranking);
    }

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
    this.dataChanged();
  }

  cloneRanking(existing?: Ranking) {
    const ranking = super.cloneRanking(existing);

    if (this.options.filterGlobally) {
      ranking.on(`${Ranking.EVENT_FILTER_CHANGED}.reorderAll`, this.reorderAll);
    }

    this.trackRanking(ranking, existing);
    return ranking;
  }

  private trackRanking(ranking: Ranking, existing?: Ranking) {

    const that = this;
    ranking.on(`${Column.EVENT_DIRTY_CACHES}.cache`, function (this: IEventContext) {
      let col: any = this.origin;
      while (col instanceof Column) {
        console.log(col.label, 'dirty data');
        that.tasks.dirtyColumn(col, 'data');
        that.tasks.preComputeCol(col);
        col = col.parent;
      }
    });

    const cols = ranking.flatColumns;
    const addKey = `${Ranking.EVENT_ADD_COLUMN}.cache`;
    const removeKey = `${Ranking.EVENT_REMOVE_COLUMN}.cache`;

    const addCol = (col: Column) => {
      this.tasks.preComputeCol(col);
      if (col instanceof CompositeColumn) {
        col.on(addKey, addCol);
        col.on(removeKey, removeCol);
      }
    };

    const removeCol = (col: Column) => {
      this.tasks.dirtyColumn(col, 'data');
      if (col instanceof CompositeColumn) {
        col.on(addKey, null);
        col.on(removeKey, null);
      }
    };


    ranking.on(addKey, addCol);
    ranking.on(removeKey, removeCol);
    for (const col of cols) {
      if (col instanceof CompositeColumn) {
        col.on(addKey, addCol);
        col.on(removeKey, removeCol);
      }
    }

    if (existing) {
      const copy = existing.flatColumns;
      for (let i = 0; i < cols.length; ++i) {
        this.tasks.copyCache(cols[i], copy[i]);
      }
    }

    this.tasks.preComputeData(ranking);
  }

  cleanUpRanking(ranking: Ranking) {
    if (this.options.filterGlobally) {
      ranking.on(`${Ranking.EVENT_FILTER_CHANGED}.reorderAll`, null);
    }


    const cols = ranking.flatColumns;
    const addKey = `${Ranking.EVENT_ADD_COLUMN}.cache`;
    const removeKey = `${Ranking.EVENT_REMOVE_COLUMN}.cache`;
    ranking.on(addKey, null);
    ranking.on(removeKey, null);
    for (const col of cols) {
      if (col instanceof CompositeColumn) {
        col.on(addKey, null);
        col.on(removeKey, null);
      }
    }

    this.tasks.dirtyRanking(ranking, 'data');

    super.cleanUpRanking(ranking);
  }

  private resolveFilter(ranking: Ranking) {
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
    return filter;
  }

  private noSorting(ranking: Ranking) {
    // initial no sorting required just index mapping
    const l = this._data.length;
    const order = createIndexArray(l);
    const index2pos = order.slice();
    for (let i = 0; i < l; ++i) {
      order[i] = i;
      index2pos[i] = i + 1; // shift since default is 0
    }

    this.tasks.preCompute(ranking, [{rows: order, group: defaultGroup}]);
    return {groups: [Object.assign({order}, defaultGroup)], index2pos};
  }

  private createSorter(ranking: Ranking, filter: ((d: IDataRow) => boolean) | null, isSortedBy: boolean, needsFiltering: boolean, needsGrouping: boolean, needsSorting: boolean) {
    const groups = new Map<string, ISortHelper>();
    const groupOrder: ISortHelper[] = [];
    let maxDataIndex = -1;

    const lookups = isSortedBy && needsSorting ? new CompareLookup(this._data.length, ranking.toCompareValueType()) : undefined;

    const pushGroup = (group: IGroup, r: IDataRow) => {
      const groupKey = group.name.toLowerCase();
      if (groups.has(groupKey)) {
        (<number[]>groups.get(groupKey)!.rows).push(r.i);
        return;
      }
      const s = {group, rows: [r.i]};
      groups.set(groupKey, s);
      groupOrder.push(s);
    };

    if (needsFiltering) {
      // filter, group, sort
      for (const r of this._dataRows) {
        if (filter && !filter(r)) {
          continue;
        }
        if (maxDataIndex < r.i) {
          maxDataIndex = r.i;
        }
        if (lookups) {
          lookups.push(r.i, ranking.toCompareValue(r));
        }
        pushGroup(ranking.grouper(r), r);
      }

      // some default sorting
      groupOrder.sort((a, b) => a.group.name.toLowerCase().localeCompare(b.group.name.toLowerCase()));
      return {maxDataIndex, lookups, groupOrder};
    }

    // reuse the existing groups

    for (const before of ranking.getGroups()) {
      const order = before.order;
      const plain = Object.assign({}, before);
      delete plain.order;

      if (!needsGrouping) {
        // reuse in full
        groupOrder.push({group: plain, rows: order});

        if (!lookups) {
          continue;
        }
        // sort
        // tslint:disable-next-line:prefer-for-of
        for (let o = 0; o < order.length; ++o) {
          const i = order[o];
          if (maxDataIndex < i) {
            maxDataIndex = i;
          }
          const r = this._dataRows[i];
          lookups.push(r.i, ranking.toCompareValue(r));
        }
        continue;
      }

      // group, [sort]
      // tslint:disable-next-line:prefer-for-of
      for (let o = 0; o < order.length; ++o) {
        const i = order[o];
        if (maxDataIndex < i) {
          maxDataIndex = i;
        }
        const r = this._dataRows[i];
        if (lookups) {
          lookups.push(r.i, ranking.toCompareValue(r));
        }
        pushGroup(needsGrouping ? ranking.grouper(r) : plain, r);
      }
    }

    if (needsGrouping) {
      // some default sorting
      groupOrder.sort((a, b) => a.group.name.toLowerCase().localeCompare(b.group.name.toLowerCase()));
    }
    return {maxDataIndex, lookups, groupOrder};
  }

  private sortGroup(g: ISortHelper, i: number, ranking: Ranking, lookups: CompareLookup | undefined, groupLookup: CompareLookup | undefined, singleGroup: boolean): Promise<IOrderedGroup> {
    const group = g.group;

    const sortTask = this.sortWorker.sort(g.rows, singleGroup, lookups);

    // compute sort group value as task
    const groupSortTask = groupLookup ? this.tasks.groupCompare(ranking, group, g.rows).then((r) => r) : <ICompareValue[]>[];

    // trigger task for groups to compute for this group


    return Promise.all([sortTask, groupSortTask]).then(([order, groupC]) => {
      if (groupLookup && Array.isArray(groupC)) {
        groupLookup.push(i, groupC);
      }
      return Object.assign({order}, group);
    });
  }

  private sortGroups(groups: IOrderedGroup[], groupLookup: CompareLookup | undefined) {
    // sort groups
    if (groupLookup) {
      const groupIndices = groups.map((_, i) => i);
      sortComplex(groupIndices, groupLookup.sortOrders);
      groups = groupIndices.map((i) => groups[i]);
    }
    return groups;
  }

  private index2pos(groups: IOrderedGroup[], maxDataIndex: number) {
    const index2pos = createIndexArray(maxDataIndex + 1);
    let offset = 1;
    for (const g of groups) {
      // tslint:disable-next-line
      for (let i = 0; i < g.order.length; i++ , offset++) {
        index2pos[g.order[i]] = offset;
      }
    }

    return {groups, index2pos};
  }

  sort(ranking: Ranking, dirtyReason: EDirtyReason[]) {
    const reasons = new Set(dirtyReason);

    if (this._data.length === 0) {
      return {groups: [], index2pos: []};
    }

    console.log(dirtyReason);

    const filter = this.resolveFilter(ranking);

    const needsFiltering = reasons.has(EDirtyReason.UNKNOWN) || reasons.has(EDirtyReason.FILTER_CHANGED);
    const needsGrouping = needsFiltering || reasons.has(EDirtyReason.GROUP_CRITERIA_CHANGED) || reasons.has(EDirtyReason.GROUP_CRITERIA_DIRTY);
    const needsSorting = needsGrouping || reasons.has(EDirtyReason.SORT_CRITERIA_CHANGED) || reasons.has(EDirtyReason.SORT_CRITERIA_DIRTY);
    const needsGroupSorting = needsGrouping || reasons.has(EDirtyReason.GROUP_SORT_CRITERIA_CHANGED) || reasons.has(EDirtyReason.GROUP_SORT_CRITERIA_DIRTY);

    if (needsFiltering) {
      this.tasks.dirtyRanking(ranking, 'summary');
    } else if (needsGrouping) {
      this.tasks.dirtyRanking(ranking, 'group');
    }
    // otherwise the summary and group summaries should still be valid

    if (!filter) {
      // all rows so summary = data
      this.tasks.copyData2Summary(ranking);
    }

    const isGroupedBy = ranking.getGroupCriteria().length > 0;
    const isSortedBy = ranking.getSortCriteria().length > 0;
    const isGroupedSortedBy = ranking.getGroupSortCriteria().length > 0;

    if (!isGroupedBy && !isSortedBy && !filter) {
      return this.noSorting(ranking);
    }

    const {maxDataIndex, lookups, groupOrder} = this.createSorter(ranking, filter, isSortedBy, needsFiltering, needsGrouping, needsSorting);

    if (groupOrder.length === 0) {
      return {groups: [], index2pos: []};
    }

    this.tasks.preCompute(ranking, groupOrder);


    if (groupOrder.length === 1) {
      const g = groupOrder[0]!;

      // not required if: group sort criteria changed -> lookups will be none
      return this.sortGroup(g, 0, ranking, lookups, undefined, true).then((group) => {
        return this.index2pos([group], maxDataIndex);
      });
    }

    const groupLookup = isGroupedSortedBy && needsGroupSorting ? new CompareLookup(groupOrder.length, ranking.toGroupCompareValueType()) : undefined;

    return Promise.all(groupOrder.map((g, i) => {
      // not required if: group sort criteria changed -> lookups will be none
      return this.sortGroup(g, i, ranking, lookups, groupLookup, false);
    })).then((groups) => {
      // not required if: sort criteria changed -> groupLookup will be none
      const sortedGroups = this.sortGroups(groups, groupLookup);
      return this.index2pos(sortedGroups, maxDataIndex);
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

  getRow(index: number) {
    return this._dataRows[index];
  }

  seq(indices: IndicesArray) {
    return lazySeq(indices).map(this.mapToDataRow);
  }

  view(indices: IndicesArray) {
    return this.viewRaw(indices);
  }

  mappingSample(col: INumberColumn): ISequence<number> {
    const MAX_SAMPLE = 120; //at most 120 sample lines
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
