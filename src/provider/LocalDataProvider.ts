import { createIndexArray, sortComplex, type ISequence, lazySeq, type IEventContext } from '../internal';
import {
  Column,
  EDirtyReason,
  Ranking,
  defaultGroup,
  type IColumnDesc,
  type ICompareValue,
  type IDataRow,
  type IGroup,
  type IndicesArray,
  type INumberColumn,
  type IOrderedGroup,
  CompositeColumn,
  ValueColumn,
} from '../model';
import ACommonDataProvider from './ACommonDataProvider';
import ADataProvider from './ADataProvider';
import type { IDataProviderOptions } from './interfaces';
import { CompareLookup } from './sort';
import type { ARenderTaskOptions, IRenderTaskExecutor } from './tasks';
import { DirectRenderTasks } from './DirectRenderTasks';
import { ScheduleRenderTasks } from './ScheduledTasks';
import { joinGroups, mapIndices, duplicateGroup } from '../model/internal';

export interface ILocalDataProviderOptions extends ARenderTaskOptions {
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
  private readonly ooptions: ILocalDataProviderOptions = {
    /**
     * whether the filter should be applied to all rankings regardless where they are
     */
    filterGlobally: false,

    jumpToSearchResult: false,

    taskExecutor: 'direct',

    stringTopNCount: 10,
  };

  private readonly reorderAll: () => void;

  private _dataRows: IDataRow[];
  private filter: ((row: IDataRow) => boolean) | null = null;
  private readonly tasks: IRenderTaskExecutor;

  constructor(
    private _data: any[],
    columns: IColumnDesc[] = [],
    options: Partial<ILocalDataProviderOptions & IDataProviderOptions> = {}
  ) {
    super(columns, options);
    Object.assign(this.ooptions, options);
    this._dataRows = toRows(_data);
    this.tasks =
      this.ooptions.taskExecutor === 'direct'
        ? new DirectRenderTasks(this.ooptions)
        : new ScheduleRenderTasks(this.ooptions);
    this.tasks.setData(this._dataRows);

    for (const ranking of this.getRankings()) {
      for (const col of ranking.flatColumns) {
        if (col instanceof ValueColumn) {
          col.onDataUpdate(this._dataRows);
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    this.reorderAll = function (this: { source?: Ranking; type: string }) {
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
    this.reorderAll.call({ type: Ranking.EVENT_FILTER_CHANGED });
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
    this.tasks.terminate();
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
      for (const col of ranking.flatColumns) {
        if (col instanceof ValueColumn && col.isLoaded()) {
          col.onDataUpdate(this._dataRows);
        }
      }
      // since it uses normalized data
      this.tasks.preComputeData(ranking);
    }

    this.fire(ADataProvider.EVENT_DATA_CHANGED, this._dataRows);
    this.reorderAll.call({ type: 'data' });
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
      this._dataRows.push({ v: d, i: this._dataRows.length });
    }
    this.dataChanged();
  }

  cloneRanking(existing?: Ranking) {
    const ranking = super.cloneRanking(existing);

    if (this.ooptions.filterGlobally) {
      ranking.on(`${Ranking.EVENT_FILTER_CHANGED}.reorderAll`, this.reorderAll);
    }

    this.trackRanking(ranking, existing);
    return ranking;
  }

  private trackRanking(ranking: Ranking, existing?: Ranking) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    ranking.on(`${Column.EVENT_DIRTY_CACHES}.cache`, function (this: IEventContext) {
      let col: any = this.origin;
      while (col instanceof Column) {
        // console.log(col.label, 'dirty data');
        that.tasks.dirtyColumn(col, 'data');
        that.tasks.preComputeCol(col);
        col = col.parent;
      }
    });

    const cols = ranking.flatColumns;
    const addKey = `${Ranking.EVENT_ADD_COLUMN}.cache`;
    const removeKey = `${Ranking.EVENT_REMOVE_COLUMN}.cache`;
    const loadedKey = `${ValueColumn.EVENT_DATA_LOADED}.cache`;

    const removeCol = (col: Column) => {
      this.tasks.dirtyColumn(col, 'data');
      if (col instanceof CompositeColumn) {
        col.on(addKey, null);
        col.on(removeKey, null);
      }
      if (col instanceof ValueColumn) {
        col.on(loadedKey, null);
      }
    };

    const addCol = (col: Column) => {
      this.tasks.preComputeCol(col);
      if (col instanceof CompositeColumn) {
        col.on(addKey, addCol);
        col.on(removeKey, removeCol);
      }
      if (col instanceof ValueColumn) {
        col.on(loadedKey, dataLoaded);
      }
    };

    function dataLoaded(this: IEventContext, _, loaded: boolean) {
      if (!loaded) {
        return;
      }
      if (this.origin instanceof ValueColumn) {
        this.origin.onDataUpdate(that._dataRows);
      }
    }

    ranking.on(addKey, addCol);
    ranking.on(removeKey, removeCol);
    for (const col of cols) {
      if (col instanceof CompositeColumn) {
        col.on(addKey, addCol);
        col.on(removeKey, removeCol);
      }
      if (col instanceof ValueColumn) {
        col.on(loadedKey, dataLoaded);
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

  protected patchColumn(column: Column): Column {
    const c = super.patchColumn(column);
    if (c instanceof ValueColumn && c.isLoaded()) {
      c.onDataUpdate(this._dataRows);
    }
    return c;
  }

  cleanUpRanking(ranking: Ranking) {
    if (this.ooptions.filterGlobally) {
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
    const filter: (Column | ((d: IDataRow) => boolean))[] = [];

    if (this.ooptions.filterGlobally) {
      for (const r of this.getRankings()) {
        if (r.isFiltered()) {
          filter.push(...r.flatColumns.filter((d) => d.isFiltered()));
        }
      }
    } else if (ranking.isFiltered()) {
      filter.push(...ranking.flatColumns.filter((d) => d.isFiltered()));
    }

    if (this.filter) {
      filter.push(this.filter);
    }
    return filter;
  }

  private noSorting(ranking: Ranking) {
    // initial no sorting required just index mapping
    const l = this._data.length;
    const order = createIndexArray(l, l - 1);
    const index2pos = order.slice();
    for (let i = 0; i < l; ++i) {
      order[i] = i;
      index2pos[i] = i + 1; // shift since default is 0
    }

    this.tasks.preCompute(ranking, [{ rows: order, group: defaultGroup }], l - 1);
    return { groups: [Object.assign({ order }, defaultGroup)], index2pos };
  }

  private createSorter(
    ranking: Ranking,
    filter: (Column | ((d: IDataRow) => boolean))[],
    needsFiltering: boolean,
    needsGrouping: boolean,
    needsSorting: boolean
  ) {
    const groups = new Map<string, ISortHelper>();
    const groupOrder: ISortHelper[] = [];
    let maxDataIndex = -1;

    const groupCriteria = ranking.getGroupCriteria();
    const lookups = needsSorting
      ? new CompareLookup(this._data.length, true, ranking, this.tasks.valueCache.bind(this.tasks))
      : undefined;

    const pushGroup = (group: IGroup, r: IDataRow) => {
      const groupKey = group.name.toLowerCase();
      if (groups.has(groupKey)) {
        (groups.get(groupKey)!.rows as number[]).push(r.i);
        return;
      }
      const s = { group, rows: [r.i] };
      groups.set(groupKey, s);
      groupOrder.push(s);
    };

    const groupCaches = groupCriteria.map((c) => this.tasks.valueCache(c));
    const filterCaches = filter.map((c) => (typeof c === 'function' ? undefined : this.tasks.valueCache(c)));

    const toGroup =
      groupCriteria.length === 1
        ? (r: IDataRow) => joinGroups([groupCriteria[0].group(r, groupCaches[0] ? groupCaches[0]!(r.i) : undefined)])
        : (r: IDataRow) =>
            joinGroups(groupCriteria.map((c, i) => c.group(r, groupCaches[i] ? groupCaches[i]!(r.i) : undefined)));

    if (needsFiltering) {
      // filter, group, sort
      outer: for (const r of this._dataRows) {
        for (let f = 0; f < filter.length; ++f) {
          const fc = filter[f];
          const c = filterCaches[f];
          if ((typeof fc === 'function' && !fc(r)) || (fc instanceof Column && !fc.filter(r, c ? c(r.i) : undefined))) {
            continue outer;
          }
        }
        if (maxDataIndex < r.i) {
          maxDataIndex = r.i;
        }
        if (lookups) {
          lookups.push(r);
        }
        pushGroup(toGroup(r), r);
      }

      // some default sorting
      groupOrder.sort((a, b) => a.group.name.toLowerCase().localeCompare(b.group.name.toLowerCase()));
      return { maxDataIndex, lookups, groupOrder };
    }

    // reuse the existing groups

    for (const before of ranking.getGroups()) {
      const order = before.order;
      if (!needsGrouping) {
        const clone = duplicateGroup(before);
        // reuse in full
        groupOrder.push({ group: clone, rows: order });

        if (!lookups) {
          maxDataIndex = (order as readonly number[]).reduce((a, b) => Math.max(a, b), maxDataIndex);
          continue;
        }
        // sort
        for (let o = 0; o < order.length; ++o) {
          const i = order[o];
          if (maxDataIndex < i) {
            maxDataIndex = i;
          }
          lookups.push(this._dataRows[i]);
        }
        continue;
      }

      // group, [sort]
      for (let o = 0; o < order.length; ++o) {
        const i = order[o];
        if (maxDataIndex < i) {
          maxDataIndex = i;
        }
        const r = this._dataRows[i];
        if (lookups) {
          lookups.push(r);
        }
        pushGroup(toGroup(r), r);
      }
    }

    if (needsGrouping) {
      // some default sorting
      groupOrder.sort((a, b) => a.group.name.toLowerCase().localeCompare(b.group.name.toLowerCase()));
    }
    return { maxDataIndex, lookups, groupOrder };
  }

  private sortGroup(
    g: ISortHelper,
    i: number,
    ranking: Ranking,
    lookups: CompareLookup | undefined,
    groupLookup: CompareLookup | undefined,
    singleGroup: boolean,
    maxDataIndex: number
  ): Promise<IOrderedGroup> {
    const group = g.group;

    const sortTask = this.tasks.sort(ranking, group, g.rows, singleGroup, maxDataIndex, lookups);

    // compute sort group value as task
    const groupSortTask = groupLookup
      ? this.tasks.groupCompare(ranking, group, g.rows).then((r) => r)
      : ([] as ICompareValue[]);

    // trigger task for groups to compute for this group

    return Promise.all([sortTask, groupSortTask]).then(([order, groupC]) => {
      if (groupLookup && Array.isArray(groupC)) {
        groupLookup.pushValues(i, groupC);
      }
      return Object.assign(group, { order });
    });
  }

  private sortGroups(groups: IOrderedGroup[], groupLookup: CompareLookup | undefined, enforceSorting: boolean) {
    // sort groups
    if (groupLookup) {
      const groupIndices = groups.map((_, i) => i);
      sortComplex(groupIndices, groupLookup.sortOrders);
      return groupIndices.map((i) => groups[i]);
    }
    if (enforceSorting) {
      // create a default sorting
      return groups.sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }

  private index2pos(groups: IOrderedGroup[], maxDataIndex: number) {
    const total = groups.reduce((a, b) => a + b.order.length, 1);
    const index2pos = createIndexArray(maxDataIndex + 1, total);
    let offset = 1;
    for (const g of groups) {
      // tslint:disable-next-line
      for (let i = 0; i < g.order.length; i++, offset++) {
        index2pos[g.order[i]] = offset;
      }
    }

    return { groups, index2pos };
  }

  sort(ranking: Ranking, dirtyReason: EDirtyReason[]) {
    const reasons = new Set(dirtyReason);

    if (this._data.length === 0) {
      return { groups: [], index2pos: [] };
    }

    // console.log(dirtyReason);

    const filter = this.resolveFilter(ranking);

    const needsFiltering = reasons.has(EDirtyReason.UNKNOWN) || reasons.has(EDirtyReason.FILTER_CHANGED);
    const needsGrouping =
      needsFiltering ||
      reasons.has(EDirtyReason.GROUP_CRITERIA_CHANGED) ||
      reasons.has(EDirtyReason.GROUP_CRITERIA_DIRTY);
    const needsSorting =
      needsGrouping || reasons.has(EDirtyReason.SORT_CRITERIA_CHANGED) || reasons.has(EDirtyReason.SORT_CRITERIA_DIRTY);
    const needsGroupSorting =
      needsGrouping ||
      reasons.has(EDirtyReason.GROUP_SORT_CRITERIA_CHANGED) ||
      reasons.has(EDirtyReason.GROUP_SORT_CRITERIA_DIRTY);

    if (needsFiltering) {
      this.tasks.dirtyRanking(ranking, 'summary');
    } else if (needsGrouping) {
      this.tasks.dirtyRanking(ranking, 'group');
    }
    // otherwise the summary and group summaries should still be valid

    if (filter.length === 0) {
      // all rows so summary = data
      this.tasks.copyData2Summary(ranking);
    }

    const isGroupedBy = ranking.getGroupCriteria().length > 0;
    const isSortedBy = ranking.getSortCriteria().length > 0;
    const isGroupedSortedBy = ranking.getGroupSortCriteria().length > 0;

    if (!isGroupedBy && !isSortedBy && filter.length === 0) {
      return this.noSorting(ranking);
    }

    const { maxDataIndex, lookups, groupOrder } = this.createSorter(
      ranking,
      filter,
      needsFiltering,
      needsGrouping,
      needsSorting
    );

    if (groupOrder.length === 0) {
      return { groups: [], index2pos: [] };
    }

    this.tasks.preCompute(ranking, groupOrder, maxDataIndex);

    if (groupOrder.length === 1) {
      const g = groupOrder[0]!;

      // not required if: group sort criteria changed -> lookups will be none
      return this.sortGroup(g, 0, ranking, lookups, undefined, true, maxDataIndex).then((group) => {
        return this.index2pos([group], maxDataIndex);
      });
    }

    const groupLookup =
      isGroupedSortedBy && needsGroupSorting ? new CompareLookup(groupOrder.length, false, ranking) : undefined;

    return Promise.all(
      groupOrder.map((g, i) => {
        // not required if: group sort criteria changed -> lookups will be none
        return this.sortGroup(g, i, ranking, lookups, groupLookup, false, maxDataIndex);
      })
    ).then((groups) => {
      // not required if: sort criteria changed -> groupLookup will be none
      const sortedGroups = this.sortGroups(groups, groupLookup, needsGroupSorting);
      return this.index2pos(sortedGroups, maxDataIndex);
    });
  }

  private readonly mapToDataRow = (i: number) => {
    if (i < 0 || i >= this._dataRows.length) {
      return { i, v: {} };
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

  searchAndJump(search: string | RegExp, col: Column, first?: boolean) {
    //case insensitive search
    const indices = this.search(search, col);
    if (first && indices.length > 0) {
      this.jumpToNearest(indices.slice(0, 1));
    } else {
      this.jumpToNearest(indices);
    }
    return indices;
  }

  search(search: string | RegExp, col: Column): number[] {
    search = typeof search === 'string' ? search.toLowerCase() : search;
    const f =
      typeof search === 'string'
        ? (v: string) => v.toLowerCase().indexOf(search as string) >= 0
        : (search as RegExp).test.bind(search);
    const indices: number[] = [];
    for (let i = 0; i < this._dataRows.length; ++i) {
      if (f(col.getLabel(this._dataRows[i]))) {
        indices.push(i);
      }
    }
    return indices;
  }
}

function toRows(data: any[]) {
  return data.map((v, i) => ({ v, i }));
}
