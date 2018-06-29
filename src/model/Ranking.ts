import {equalArrays, fixCSS} from '../internal';
import AEventDispatcher, {suffix} from '../internal/AEventDispatcher';
import {isSortingAscByDefault} from './annotations';
import Column, {IColumnParent, IFlatColumn, visibilityChanged, dirtyValues, dirtyHeader, labelChanged, widthChanged, dirty} from './Column';
import {defaultGroup, IOrderedGroup} from './Group';
import {IDataRow, IGroup, IGroupData} from './interfaces';
import {joinGroups} from './internal';
import NumberColumn, {filterChanged} from './NumberColumn';
import CompositeColumn from './CompositeColumn';
import {IEventListener} from '../internal/AEventDispatcher';

export interface ISortCriteria {
  readonly col: Column;
  readonly asc: boolean;
}


/**
 * emitted when a column has been added
 * @asMemberOf Ranking
 * @event
 */
export declare function addColumn(col: Column, index: number): void;

/**
 * emitted when a column has been moved within this composite columm
 * @asMemberOf Ranking
 * @event
 */
export declare function moveColumn(col: Column, index: number, oldIndex: number): void;

/**
 * emitted when a column has been removed
 * @asMemberOf Ranking
 * @event
 */
export declare function removeColumn(col: Column, index: number): void;
/**
 * emitted when the sort criteria propery changes
 * @asMemberOf Ranking
 * @event
 */
export declare function sortCriteriaChanged(previous: ISortCriteria[], current: ISortCriteria[]): void;
/**
 * emitted when the sort criteria propery changes
 * @asMemberOf Ranking
 * @event
 */
export declare function groupCriteriaChanged(previous: Column[], current: Column[]): void;
/**
 * emitted when the sort criteria propery changes
 * @asMemberOf Ranking
 * @event
 */
export declare function groupSortCriteriaChanged(previous: ISortCriteria[], current: ISortCriteria[]): void;
/**
 * emitted when the sort criteria propery changes
 * @asMemberOf Ranking
 * @event
 */
export declare function dirtyOrder(): void;
/**
 * @asMemberOf Ranking
 * @event
 */
export declare function orderChanged(previous: number[], current: number[], previousGroups: IOrderedGroup[], currentGroups: IOrderedGroup[]): void;
/**
 * @asMemberOf Ranking
 * @event
 */
export declare function groupsChanged(previous: number[], current: number[], previousGroups: IOrderedGroup[], currentGroups: IOrderedGroup[]): void;

/**
 * a ranking
 */
export default class Ranking extends AEventDispatcher implements IColumnParent {
  static readonly EVENT_WIDTH_CHANGED = Column.EVENT_WIDTH_CHANGED;
  static readonly EVENT_FILTER_CHANGED = NumberColumn.EVENT_FILTER_CHANGED;
  static readonly EVENT_LABEL_CHANGED = Column.EVENT_LABEL_CHANGED;
  static readonly EVENT_ADD_COLUMN = CompositeColumn.EVENT_ADD_COLUMN;
  static readonly EVENT_MOVE_COLUMN = CompositeColumn.EVENT_MOVE_COLUMN;
  static readonly EVENT_REMOVE_COLUMN = CompositeColumn.EVENT_REMOVE_COLUMN;
  static readonly EVENT_DIRTY = Column.EVENT_DIRTY;
  static readonly EVENT_DIRTY_HEADER = Column.EVENT_DIRTY_HEADER;
  static readonly EVENT_DIRTY_VALUES = Column.EVENT_DIRTY_VALUES;
  static readonly EVENT_COLUMN_VISIBILITY_CHANGED = Column.EVENT_VISIBILITY_CHANGED;
  static readonly EVENT_SORT_CRITERIA_CHANGED = 'sortCriteriaChanged';
  static readonly EVENT_GROUP_CRITERIA_CHANGED = 'groupCriteriaChanged';
  static readonly EVENT_GROUP_SORT_CRITERIA_CHANGED = 'groupSortCriteriaChanged';
  static readonly EVENT_DIRTY_ORDER = 'dirtyOrder';
  static readonly EVENT_ORDER_CHANGED = 'orderChanged';
  static readonly EVENT_GROUPS_CHANGED = 'groupsChanged';


  /**
   * the list of sort criteria
   * @type {Array}
   */
  private readonly sortCriteria: ISortCriteria[] = [];
  private readonly groupSortCriteria: ISortCriteria[] = [];

  private readonly groupColumns: Column[] = [];

  /**
   * columns of this ranking
   * @type {Array}
   * @private
   */
  private readonly columns: Column[] = [];

  readonly comparator = (a: IDataRow, b: IDataRow) => {
    if (this.sortCriteria.length === 0) {
      return a.i - b.i;
    }
    for (const sort of this.sortCriteria) {
      const r = sort.col!.compare(a, b);
      if (r !== 0) {
        return sort.asc ? r : -r;
      }
    }
    return a.i - b.i; //to have a deterministic order
  };

  readonly groupComparator = (a: IGroupData, b: IGroupData) => {
    if (this.groupSortCriteria.length === 0) {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    }
    for (const sort of this.groupSortCriteria) {
      const r = sort.col!.groupCompare(a, b);
      if (r !== 0) {
        return sort.asc ? r : -r;
      }
    }
    return a.name.localeCompare(b.name);
  };

  readonly grouper = (row: IDataRow): IGroup => {
    const g = this.groupColumns;
    switch (g.length) {
      case 0:
        return defaultGroup;
      case 1:
        return g[0].group(row);
      default:
        const groups = g.map((gi) => gi.group(row));
        return joinGroups(groups);
    }
  };

  readonly dirtyOrder = () => {
    this.fire([Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], this.getSortCriteria(), this.getGroupSortCriteria(), this.getGroupCriteria());
  };

  /**
   * the current ordering as an sorted array of indices
   * @type {Array}
   */
  private groups: IOrderedGroup[] = [Object.assign({order: <number[]>[]}, defaultGroup)];

  constructor(public id: string, private maxSortCriteria = 2, private maxGroupColumns = 1) {
    super();
    this.id = fixCSS(id);
  }

  protected createEventList() {
    return super.createEventList().concat([
      Ranking.EVENT_WIDTH_CHANGED, Ranking.EVENT_FILTER_CHANGED,
      Ranking.EVENT_LABEL_CHANGED, Ranking.EVENT_GROUPS_CHANGED,
      Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_MOVE_COLUMN,
      Ranking.EVENT_DIRTY, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES,
      Ranking.EVENT_GROUP_SORT_CRITERIA_CHANGED, Ranking.EVENT_COLUMN_VISIBILITY_CHANGED,
      Ranking.EVENT_SORT_CRITERIA_CHANGED, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_ORDER_CHANGED]);
  }

  on(type: typeof Ranking.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Ranking.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
  on(type: typeof Ranking.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Ranking.EVENT_ADD_COLUMN, listener: typeof addColumn | null): this;
  on(type: typeof Ranking.EVENT_MOVE_COLUMN, listener: typeof moveColumn | null): this;
  on(type: typeof Ranking.EVENT_REMOVE_COLUMN, listener: typeof removeColumn | null): this;
  on(type: typeof Ranking.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Ranking.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Ranking.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Ranking.EVENT_COLUMN_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: typeof Ranking.EVENT_SORT_CRITERIA_CHANGED, listener: typeof sortCriteriaChanged | null): this;
  on(type: typeof Ranking.EVENT_GROUP_CRITERIA_CHANGED, listener: typeof groupCriteriaChanged | null): this;
  on(type: typeof Ranking.EVENT_GROUP_SORT_CRITERIA_CHANGED, listener: typeof groupSortCriteriaChanged | null): this;
  on(type: typeof Ranking.EVENT_DIRTY_ORDER, listener: typeof dirtyOrder | null): this;
  on(type: typeof Ranking.EVENT_ORDER_CHANGED, listener: typeof orderChanged | null): this;
  on(type: typeof Ranking.EVENT_GROUPS_CHANGED, listener: typeof groupsChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this;
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }

  assignNewId(idGenerator: () => string) {
    this.id = fixCSS(idGenerator());
    this.columns.forEach((c) => c.assignNewId(idGenerator));
  }

  setOrder(order: number[]) {
    this.setGroups([Object.assign({order}, defaultGroup)]);
  }

  setGroups(groups: IOrderedGroup[]) {
    const old = this.getOrder();
    const oldGroups = this.groups;
    this.groups = groups;
    this.fire([Ranking.EVENT_ORDER_CHANGED, Ranking.EVENT_GROUPS_CHANGED, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], old, this.getOrder(), oldGroups, groups);
  }

  getOrder() {
    switch (this.groups.length) {
      case 0:
        return [];
      case 1:
        return this.groups[0].order;
      default:
        return (<number[]>[]).concat(...this.groups.map((g) => g.order));
    }
  }

  getGroups() {
    return this.groups.slice();
  }

  dump(toDescRef: (desc: any) => any) {
    const r: any = {};
    r.columns = this.columns.map((d) => d.dump(toDescRef));
    r.sortCriteria = this.sortCriteria.map((s) => ({asc: s.asc, sortBy: s.col!.id}));
    r.groupSortCriteria = this.groupSortCriteria.map((s) => ({asc: s.asc, sortBy: s.col!.id}));
    r.groupColumns = this.groupColumns.map((d) => d.id);
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    this.clear();
    dump.columns.map((child: any) => {
      const c = factory(child);
      if (c) {
        this.push(c);
      }
    });
    // compatibility case
    if (dump.sortColumn && dump.sortColumn.sortBy) {
      const help = this.columns.find((d) => d.id === dump.sortColumn.sortBy);
      if (help) {
        this.sortBy(help, dump.sortColumn.asc);
      }
    }
    if (dump.groupColumns) {
      const groupColumns = dump.groupColumns.map((id: string) => this.columns.find((d) => d.id === id));
      this.groupBy(groupColumns);
    }

    const restoreSortCriteria = (dumped: any) => {
      return dumped.map((s: { asc: boolean, sortBy: string }) => {
        return {
          asc: s.asc,
          col: this.columns.find((d) => d.id === s.sortBy) || null
        };
      }).filter((s: any) => s.col);
    };

    if (dump.sortCriteria) {
      this.setSortCriteria(restoreSortCriteria(dump.sortCriteria));
    }

    if (dump.groupSortCriteria) {
      this.setGroupSortCriteria(restoreSortCriteria(dump.groupSortCriteria));
    }
  }

  flatten(r: IFlatColumn[], offset: number, levelsToGo = 0, padding = 0) {
    let acc = offset; // + this.getWidth() + padding;
    if (levelsToGo > 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      this.columns.forEach((c) => {
        if (c.getVisible() && levelsToGo <= Column.FLAT_ALL_COLUMNS) {
          acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
        }
      });
    }
    return acc - offset;
  }

  getPrimarySortCriteria(): ISortCriteria | null {
    if (this.sortCriteria.length === 0) {
      return null;
    }
    return this.sortCriteria[0];
  }

  getSortCriteria(): ISortCriteria[] {
    return this.sortCriteria.map((d) => Object.assign({}, d));
  }

  getGroupSortCriteria(): ISortCriteria[] {
    return this.groupSortCriteria.map((d) => Object.assign({}, d));
  }

  toggleSorting(col: Column) {
    return this.setSortCriteria(this.toggleSortingLogic(col, this.sortCriteria));
  }

  private toggleSortingLogic(col: Column, sortCriteria: ISortCriteria[]) {
    const newSort = sortCriteria.slice();
    const current = newSort.findIndex((d) => d.col === col);
    const defaultAsc = isSortingAscByDefault(col);

    if (current < 0) {
      newSort.splice(0, newSort.length, {col, asc: defaultAsc});
    } else if (newSort[current].asc === defaultAsc) {
      // asc -> desc, or desc -> asc
      newSort.splice(current, 1, {col, asc: !defaultAsc});
    } else {
      // remove
      newSort.splice(current, 1);
    }
    return newSort;
  }

  toggleGrouping(col: Column) {
    const old = this.groupColumns.indexOf(col);
    if (old >= 0) {
      const newGroupings = this.groupColumns.slice();
      newGroupings.splice(old, 1);
      return this.setGroupCriteria(newGroupings);
    }
    return this.setGroupCriteria([col]);
  }

  getGroupCriteria() {
    return this.groupColumns.slice();
  }

  /**
   * replaces, moves, or remove the given column in the sorting hierarchy
   * @param col {Column}
   * @param priority {number} when priority < 0 remove the column only else replace at the given priority
   */
  sortBy(col: Column, ascending: boolean = false, priority: number = 0) {
    if (col.findMyRanker() !== this) {
      return false; //not one of mine
    }
    return this.setSortCriteria(this.hierarchyLogic(this.sortCriteria, this.sortCriteria.findIndex((d) => d.col === col), {col, asc: ascending}, priority));
  }

  /**
   * replaces, moves, or remove the given column in the group sorting hierarchy
   * @param col {Column}
   * @param priority {number} when priority < 0 remove the column only else replace at the given priority
   */
  groupSortBy(col: Column, ascending: boolean = false, priority: number = 0) {
    if (col.findMyRanker() !== this) {
      return false; //not one of mine
    }
    return this.setGroupSortCriteria(this.hierarchyLogic(this.groupSortCriteria, this.groupSortCriteria.findIndex((d) => d.col === col), {col, asc: ascending}, priority));
  }

  private hierarchyLogic<T>(entries: T[], index: number, entry: T, priority: number) {
    entries = entries.slice();
    if (index >= 0) {
      // move at the other position
      entries.splice(index, 1);
      if (priority >= 0) {
        entries.splice(Math.min(priority, entries.length), 0, entry);
      }
    } else if (priority >= 0) {
      entries[Math.min(priority, entries.length)] = entry;
    }
    return entries;
  }

  /**
   * replaces, moves, or remove the given column in the grouping hierarchy
   * @param col {Column}
   * @param priority {number} when priority < 0 remove the column only else replace at the given priority
   */
  groupBy(col: Column, priority: number = 0): boolean {
    if (col.findMyRanker() !== this) {
      return false; //not one of mine
    }
    return this.setGroupCriteria(this.hierarchyLogic(this.groupColumns, this.groupColumns.indexOf(col), col, priority));
  }

  setSortCriteria(value: ISortCriteria | ISortCriteria[]) {
    const values = Array.isArray(value) ? value.slice() : [value];
    // trim
    if (values.length > this.maxSortCriteria) {
      values.splice(this.maxSortCriteria, values.length - this.maxSortCriteria);
    }
    const bak = this.sortCriteria.slice();

    if (equalCriteria(values, bak)) {
      return false;
    }

    // update listener
    bak.forEach((d) => {
      d.col.on(`${Column.EVENT_DIRTY_VALUES}.order`, null!);
      d.col.on(`${NumberColumn.EVENT_SORTMETHOD_CHANGED}.order`, null!);
    });

    values.forEach((d) => {
      d.col.on(`${Column.EVENT_DIRTY_VALUES}.order`, this.dirtyOrder);
      d.col.on(`${NumberColumn.EVENT_SORTMETHOD_CHANGED}.order`, this.dirtyOrder);
    });
    this.sortCriteria.splice(0, this.sortCriteria.length, ...values.slice());
    this.triggerResort(bak);
    return true;
  }

  setGroupCriteria(column: Column[]|Column) {
    let cols = Array.isArray(column) ? column : [column];

    // trim
    if (cols.length > this.maxGroupColumns) {
      cols = cols.slice(0, this.maxGroupColumns);
    }

    if (equalArrays(this.groupColumns, cols)) {
      return true; //same
    }
    this.groupColumns.forEach((groupColumn) => {
      groupColumn.on(suffix('.group', Column.EVENT_DIRTY_VALUES, NumberColumn.EVENT_SORTMETHOD_CHANGED, NumberColumn.EVENT_GROUPING_CHANGED), null);
    });

    const bak = this.groupColumns.slice();
    this.groupColumns.splice(0, this.groupColumns.length, ...cols);

    this.groupColumns.forEach((groupColumn) => {
      groupColumn.on(suffix('.group', Column.EVENT_DIRTY_VALUES, NumberColumn.EVENT_SORTMETHOD_CHANGED, NumberColumn.EVENT_GROUPING_CHANGED), this.dirtyOrder);
    });

    this.fire([Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_HEADER,
      Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], bak, this.getGroupCriteria());
    return true;
  }

  toggleGroupSorting(col: Column) {
    return this.setGroupSortCriteria(this.toggleSortingLogic(col, this.groupSortCriteria));
  }

  setMaxSortCriteria(maxSortCriteria: number) {
    const old = this.maxSortCriteria;
    if (old === maxSortCriteria) {
      return;
    }
    this.maxSortCriteria = maxSortCriteria;
    if (old < maxSortCriteria || this.sortCriteria.length < maxSortCriteria) {
      return;
    }
    // check if we have to slice
    this.setSortCriteria(this.sortCriteria.slice(0, maxSortCriteria));
  }

  getMaxSortCriteria() {
    return this.maxSortCriteria;
  }

  setMaxGroupColumns(maxGroupColumns: number) {
    const old = this.maxGroupColumns;
    if (old === maxGroupColumns) {
      return;
    }
    this.maxGroupColumns = maxGroupColumns;
    if (old < maxGroupColumns || this.groupColumns.length < maxGroupColumns) {
      return;
    }
    // check if we have to slice
    this.setGroupCriteria(this.groupColumns.slice(0, maxGroupColumns));
  }

  getMaxGroupColumns() {
    return this.maxGroupColumns;
  }

  setGroupSortCriteria(value: ISortCriteria | ISortCriteria[]) {
    const values = Array.isArray(value) ? value.slice() : [value];
    // trim
    if (values.length > this.maxSortCriteria) {
      values.splice(this.maxSortCriteria, values.length - this.maxSortCriteria);
    }

    const bak = this.groupSortCriteria.slice();

    if (equalCriteria(values, bak)) {
      return false;
    }

    bak.forEach((d) => {
      d.col.on(`${Column.EVENT_DIRTY_VALUES}.groupOrder`, null!);
      d.col.on(`${NumberColumn.EVENT_SORTMETHOD_CHANGED}.groupOrder`, null!);
    });

    values.forEach((d) => {
      d.col.on(`${Column.EVENT_DIRTY_VALUES}.groupOrder`, this.dirtyOrder);
      d.col.on(`${NumberColumn.EVENT_SORTMETHOD_CHANGED}.groupOrder`, this.dirtyOrder);
    });
    this.groupSortCriteria.splice(0, this.groupSortCriteria.length, ...values.slice());
    this.triggerGroupResort(bak);
    return true;
  }

  private triggerGroupResort(bak: ISortCriteria | ISortCriteria[] | null) {
    const sortCriterias = this.getGroupSortCriteria();
    const bakMulti = Array.isArray(bak) ? bak : sortCriterias;
    this.fire([Ranking.EVENT_GROUP_SORT_CRITERIA_CHANGED, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_HEADER,
      Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], bakMulti, sortCriterias);
  }

  private triggerResort(bak: ISortCriteria | ISortCriteria[] | null) {
    const sortCriterias = this.getSortCriteria();
    const bakMulti = Array.isArray(bak) ? bak : sortCriterias;
    this.fire([Ranking.EVENT_SORT_CRITERIA_CHANGED, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_HEADER,
      Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], bakMulti, sortCriterias);
  }

  get children() {
    return this.columns.slice();
  }

  get length() {
    return this.columns.length;
  }

  insert(col: Column, index: number = this.columns.length) {
    this.columns.splice(index, 0, col);
    col.parent = this;
    this.forward(col, ...suffix('.ranking', Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY, NumberColumn.EVENT_FILTER_CHANGED));
    col.on(`${Ranking.EVENT_FILTER_CHANGED}.order`, this.dirtyOrder);

    col.on(`${Column.EVENT_VISIBILITY_CHANGED}.ranking`, (oldValue, newValue) => this.fire([Ranking.EVENT_COLUMN_VISIBILITY_CHANGED, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, oldValue, newValue));

    this.fire([Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, index);
    return col;
  }

  move(col: Column, index: number = this.columns.length) {
    if (col.parent !== this) {
      // not a move operation!
      console.error('invalid move operation: ', col);
      return null;
    }
    const old = this.columns.indexOf(col);
    if (index === old) {
      // no move needed
      return col;
    }
    //delete first
    this.columns.splice(old, 1);
    // adapt target index based on previous index, i.e shift by one
    this.columns.splice(old < index ? index - 1 : index, 0, col);

    this.fire([Ranking.EVENT_MOVE_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, index, old);
    return col;
  }

  moveAfter(col: Column, reference: Column) {
    const i = this.columns.indexOf(reference);
    if (i < 0) {
      return null;
    }
    return this.move(col, i + 1);
  }

  get fqpath() {
    return '';
  }

  findByPath(fqpath: string): Column {
    let p: IColumnParent | Column = <any>this;
    const indices = fqpath.split('@').map(Number).slice(1); //ignore the first entry = ranking
    while (indices.length > 0) {
      const i = indices.shift()!;
      p = (<IColumnParent>p).at(i);
    }
    return <Column>p;
  }

  indexOf(col: Column) {
    return this.columns.indexOf(col);
  }

  at(index: number) {
    return this.columns[index];
  }

  insertAfter(col: Column, ref: Column) {
    const i = this.columns.indexOf(ref);
    if (i < 0) {
      return null;
    }
    return this.insert(col, i + 1);
  }

  push(col: Column) {
    return this.insert(col);
  }

  remove(col: Column) {
    const i = this.columns.indexOf(col);
    if (i < 0) {
      return false;
    }

    this.unforward(col, ...suffix('.ranking', Column.EVENT_VISIBILITY_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY, NumberColumn.EVENT_FILTER_CHANGED));

    const isSortCriteria = this.sortCriteria.findIndex((d) => d.col === col);
    const sortCriteriaChanged = isSortCriteria >= 0;
    if (sortCriteriaChanged) {
      this.sortCriteria.splice(isSortCriteria, 1);
    }

    const isGroupSortCriteria = this.groupSortCriteria.findIndex((d) => d.col === col);
    const groupSortCriteriaChanged = isGroupSortCriteria >= 0;
    if (groupSortCriteriaChanged) {
      this.groupSortCriteria.splice(isGroupSortCriteria, 1);
    }

    let newGrouping: Column[]|null = null;
    const isGroupColumn = this.groupColumns.indexOf(col);
    if (isGroupColumn >= 0) { // was my grouping criteria
      newGrouping = this.groupColumns.slice();
      newGrouping.splice(isGroupColumn, 1);
    }

    col.parent = null;
    this.columns.splice(i, 1);

    this.fire([Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, i);

    if (newGrouping) {
      this.setGroupCriteria(newGrouping);
    } else if (sortCriteriaChanged) {
      this.triggerResort(null);
    } else if (groupSortCriteriaChanged) {
      this.triggerGroupResort(null);
    }

    return true;
  }

  clear() {
    if (this.columns.length === 0) {
      return;
    }
    this.sortCriteria.splice(0, this.sortCriteria.length);
    this.groupSortCriteria.splice(0, this.groupSortCriteria.length);

    this.groupColumns.forEach((groupColumn) => {
      groupColumn.on(`${Column.EVENT_DIRTY_VALUES}.group`, null);
      groupColumn.on(`${NumberColumn.EVENT_SORTMETHOD_CHANGED}.group`, null);
    });
    this.groupColumns.splice(0, this.groupColumns.length);

    this.columns.forEach((col) => {
      this.unforward(col, ...suffix('.ranking', Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY, NumberColumn.EVENT_FILTER_CHANGED));
      col.parent = null;
    });
    const removed = this.columns.splice(0, this.columns.length);
    this.fire([Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], removed);
  }

  get flatColumns(): Column[] {
    const r: IFlatColumn[] = [];
    this.flatten(r, 0, Column.FLAT_ALL_COLUMNS);
    return r.map((d) => d.col);
  }

  find(idOrFilter: string | ((col: Column) => boolean)) {
    const filter = typeof(idOrFilter) === 'string' ? (col: Column) => col.id === idOrFilter : idOrFilter;
    const r = this.flatColumns;
    for (const v of r) {
      if (filter(v)) {
        return v;
      }
    }
    return null;
  }

  isFiltered() {
    return this.columns.some((d) => d.isFiltered());
  }

  filter(row: IDataRow) {
    return this.columns.every((d) => d.filter(row));
  }

  findMyRanker() {
    return this;
  }

  get fqid() {
    return this.id;
  }
}

function equalCriteria(a: ISortCriteria[], b: ISortCriteria[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((ai, i) => {
    const bi = b[i];
    return ai.col === bi.col && ai.asc === bi.asc;
  });
}
