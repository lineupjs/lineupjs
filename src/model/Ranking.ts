import {equalArrays, fixCSS, IEventListener, suffix, joinIndexArrays, AEventDispatcher} from '../internal';
import {isSortingAscByDefault} from './annotations';
import Column, {dirty, dirtyCaches, dirtyHeader, dirtyValues, labelChanged, visibilityChanged, widthChanged} from './Column';
import CompositeColumn from './CompositeColumn';
import {IRankingDump, defaultGroup, IndicesArray, IOrderedGroup, IDataRow, IColumnParent, IFlatColumn, ISortCriteria, UIntTypedArray, IGroupParent} from './interfaces';
import {groupRoots, isOrderedGroup} from './internal';

export enum EDirtyReason {
  UNKNOWN = 'unknown',
  FILTER_CHANGED = 'filter',
  SORT_CRITERIA_CHANGED = 'sort_changed',
  SORT_CRITERIA_DIRTY = 'sort_dirty',
  GROUP_CRITERIA_CHANGED = 'group_changed',
  GROUP_CRITERIA_DIRTY = 'group_dirty',
  GROUP_SORT_CRITERIA_CHANGED = 'group_sort_changed',
  GROUP_SORT_CRITERIA_DIRTY = 'group_sort_dirty'
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
export declare function dirtyOrder(reason?: EDirtyReason[]): void;
/**
 * @asMemberOf Ranking
 * @event
 */
export declare function orderChanged(previous: number[], current: number[], previousGroups: IOrderedGroup[], currentGroups: IOrderedGroup[], dirtyReason: EDirtyReason[]): void;
/**
 * @asMemberOf Ranking
 * @event
 */
export declare function groupsChanged(previous: number[], current: number[], previousGroups: IOrderedGroup[], currentGroups: IOrderedGroup[]): void;

/**
 * emitted when the filter property changes
 * @asMemberOf NumberColumn
 * @event
 */
export declare function filterChanged(previous: any | null, current: any | null): void;
/**
 * a ranking
 */
export default class Ranking extends AEventDispatcher implements IColumnParent {
  static readonly EVENT_WIDTH_CHANGED = Column.EVENT_WIDTH_CHANGED;
  static readonly EVENT_FILTER_CHANGED = 'filterChanged';
  static readonly EVENT_LABEL_CHANGED = Column.EVENT_LABEL_CHANGED;
  static readonly EVENT_ADD_COLUMN = CompositeColumn.EVENT_ADD_COLUMN;
  static readonly EVENT_MOVE_COLUMN = CompositeColumn.EVENT_MOVE_COLUMN;
  static readonly EVENT_REMOVE_COLUMN = CompositeColumn.EVENT_REMOVE_COLUMN;
  static readonly EVENT_DIRTY = Column.EVENT_DIRTY;
  static readonly EVENT_DIRTY_HEADER = Column.EVENT_DIRTY_HEADER;
  static readonly EVENT_DIRTY_VALUES = Column.EVENT_DIRTY_VALUES;
  static readonly EVENT_DIRTY_CACHES = Column.EVENT_DIRTY_CACHES;
  static readonly EVENT_COLUMN_VISIBILITY_CHANGED = Column.EVENT_VISIBILITY_CHANGED;
  static readonly EVENT_SORT_CRITERIA_CHANGED = 'sortCriteriaChanged';
  static readonly EVENT_GROUP_CRITERIA_CHANGED = 'groupCriteriaChanged';
  static readonly EVENT_GROUP_SORT_CRITERIA_CHANGED = 'groupSortCriteriaChanged';
  static readonly EVENT_DIRTY_ORDER = 'dirtyOrder';
  static readonly EVENT_ORDER_CHANGED = 'orderChanged';
  static readonly EVENT_GROUPS_CHANGED = 'groupsChanged';

  private static readonly FORWARD_COLUMN_EVENTS = suffix('.ranking', Column.EVENT_VISIBILITY_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY, Column.EVENT_VISIBILITY_CHANGED, Ranking.EVENT_FILTER_CHANGED);
  private static readonly COLUMN_GROUP_SORT_DIRTY = suffix('.groupOrder', Column.EVENT_DIRTY_CACHES, 'sortMethodChanged');
  private static readonly COLUMN_SORT_DIRTY = suffix('.order', Column.EVENT_DIRTY_CACHES);
  private static readonly COLUMN_GROUP_DIRTY = suffix('.group', Column.EVENT_DIRTY_CACHES, 'groupingChanged');


  private label: string;

  private readonly sortCriteria: ISortCriteria[] = [];
  private readonly groupColumns: Column[] = [];
  private readonly groupSortCriteria: ISortCriteria[] = [];

  /**
   * columns of this ranking
   * @type {Array}
   * @private
   */
  private readonly columns: Column[] = [];

  readonly dirtyOrder = (reason?: EDirtyReason[]) => {
    this.fire([Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], reason);
  };
  private readonly dirtyOrderSortDirty = () => this.dirtyOrder([EDirtyReason.SORT_CRITERIA_DIRTY]);
  private readonly dirtyOrderGroupDirty = () => this.dirtyOrder([EDirtyReason.GROUP_CRITERIA_DIRTY]);
  private readonly dirtyOrderGroupSortDirty = () => this.dirtyOrder([EDirtyReason.GROUP_SORT_CRITERIA_DIRTY]);
  private readonly dirtyOrderFiltering = () => this.dirtyOrder([EDirtyReason.FILTER_CHANGED]);

  /**
   * the current ordering as an sorted array of indices
   * @type {Array}
   */
  private groups: IOrderedGroup[] = [Object.assign({order: <number[]>[]}, defaultGroup)];
  private order: IndicesArray = [];
  private index2pos: IndicesArray = [];

  constructor(public id: string) {
    super();
    this.id = fixCSS(id);
    this.label = `Ranking ${id.startsWith('rank') ? id.slice(4) : id}`;
  }

  protected createEventList() {
    return super.createEventList().concat([
      Ranking.EVENT_WIDTH_CHANGED, Ranking.EVENT_FILTER_CHANGED,
      Ranking.EVENT_LABEL_CHANGED, Ranking.EVENT_GROUPS_CHANGED,
      Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_MOVE_COLUMN,
      Ranking.EVENT_DIRTY, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY_CACHES,
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
  on(type: typeof Ranking.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  on(type: typeof Ranking.EVENT_COLUMN_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: typeof Ranking.EVENT_SORT_CRITERIA_CHANGED, listener: typeof sortCriteriaChanged | null): this;
  on(type: typeof Ranking.EVENT_GROUP_CRITERIA_CHANGED, listener: typeof groupCriteriaChanged | null): this;
  on(type: typeof Ranking.EVENT_GROUP_SORT_CRITERIA_CHANGED, listener: typeof groupSortCriteriaChanged | null): this;
  on(type: typeof Ranking.EVENT_DIRTY_ORDER, listener: typeof dirtyOrder | null): this;
  on(type: typeof Ranking.EVENT_ORDER_CHANGED, listener: typeof orderChanged | null): this;
  on(type: typeof Ranking.EVENT_GROUPS_CHANGED, listener: typeof groupsChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }

  assignNewId(idGenerator: () => string) {
    this.id = fixCSS(idGenerator());
    this.columns.forEach((c) => c.assignNewId(idGenerator));
  }

  getLabel() {
    return this.label;
  }

  setLabel(value: string) {
    if (value === this.label) {
      return;
    }
    this.fire(Ranking.EVENT_LABEL_CHANGED, this.label, this.label = value);
  }

  setGroups(groups: IOrderedGroup[], index2pos: IndicesArray, dirtyReason: EDirtyReason[]) {
    const old = this.order;
    const oldGroups = this.groups;
    this.groups = groups;
    this.index2pos = index2pos;
    this.order = joinIndexArrays(groups.map((d) => d.order));
    // replace with subarrays to save memory
    if (groups.length > 1) {
      let offset = 0;
      const order = <UIntTypedArray>this.order;
      const offsets = new Map<Readonly<IGroupParent> | IOrderedGroup, {offset: number, size: number}>();
      for (const group of groups) {
        const size = group.order.length;
        group.order = order.subarray(offset, offset + size);
        offsets.set(group, {offset, size});
        offset += size;
      }
      // propgate also to the top with views
      const roots = groupRoots(groups);
      const resolve = (g: Readonly<IGroupParent> | IOrderedGroup): {offset: number, size: number} => {
        if (isOrderedGroup(g) || offsets.has(g)) {
          return offsets.get(g)!;
        }
        const subs = g.subGroups.map((gi) => resolve(<Readonly<IGroupParent> | IOrderedGroup>gi));
        const offset = subs[0].offset;
        const size = subs.reduce((a, b) => a + b.size, 0);
        const r = {offset, size};
        offsets.set(g, r);
        (<IOrderedGroup><unknown>g).order = order.subarray(offset, offset + size);
        return r;
      };
      for (const root of roots) {
        resolve(root);
      }
    } else if (groups.length === 1) {
      // propagate to the top
      let p = groups[0].parent;
      while (p) {
        (<IOrderedGroup><unknown>p).order = this.order;
        p = p.parent;
      }
    }
    this.fire([Ranking.EVENT_ORDER_CHANGED, Ranking.EVENT_GROUPS_CHANGED, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], old, this.order, oldGroups, groups, dirtyReason);
  }

  getRank(dataIndex: number) {
    if (dataIndex < 0 || dataIndex > this.index2pos.length) {
      return -1;
    }
    const v = this.index2pos[dataIndex];
    return v != null && !isNaN(v) && v > 0 ? v : -1;
  }

  getOrder() {
    return this.order;
  }

  getOrderLength() {
    return this.order.length;
  }

  getGroups() {
    return this.groups.slice();
  }

  dump(toDescRef: (desc: any) => any): IRankingDump {
    const r: IRankingDump = {};
    r.columns = this.columns.map((d) => d.dump(toDescRef));
    r.sortCriteria = this.sortCriteria.map((s) => ({asc: s.asc, sortBy: s.col!.id}));
    r.groupSortCriteria = this.groupSortCriteria.map((s) => ({asc: s.asc, sortBy: s.col!.id}));
    r.groupColumns = this.groupColumns.map((d) => d.id);
    return r;
  }

  restore(dump: IRankingDump, factory: (dump: any) => Column | null) {
    this.clear();
    (dump.columns || []).map((child: any) => {
      const c = factory(child);
      if (c) {
        this.push(c);
      }
    });
    // compatibility case
    if (dump.sortColumn && dump.sortColumn.sortBy) {
      const help = this.columns.find((d) => d.id === dump.sortColumn!.sortBy);
      if (help) {
        this.sortBy(help, dump.sortColumn.asc);
      }
    }
    if (dump.groupColumns) {
      const groupColumns = <Column[]>dump.groupColumns.map((id: string) => this.columns.find((d) => d.id === id)).filter((d) => d != null);
      this.setGroupCriteria(groupColumns);
    }

    const restoreSortCriteria = (dumped: any) => {
      return dumped.map((s: {asc: boolean, sortBy: string}) => {
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
    const bak = this.sortCriteria.slice();

    if (equalCriteria(values, bak)) {
      return false;
    }

    // update listener
    bak.forEach((d) => {
      d.col.on(Ranking.COLUMN_SORT_DIRTY, null!);
    });

    values.forEach((d) => {
      d.col.on(Ranking.COLUMN_SORT_DIRTY, this.dirtyOrderSortDirty);
    });
    this.sortCriteria.splice(0, this.sortCriteria.length, ...values.slice());
    this.triggerResort(bak);
    return true;
  }

  setGroupCriteria(column: Column[] | Column) {
    const cols = Array.isArray(column) ? column : [column];

    if (equalArrays(this.groupColumns, cols)) {
      return true; //same
    }
    this.groupColumns.forEach((groupColumn) => {
      groupColumn.on(Ranking.COLUMN_GROUP_DIRTY, null);
    });

    const bak = this.groupColumns.slice();
    this.groupColumns.splice(0, this.groupColumns.length, ...cols);

    this.groupColumns.forEach((groupColumn) => {
      groupColumn.on(Ranking.COLUMN_GROUP_DIRTY, this.dirtyOrderGroupDirty);
    });

    this.fire([Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_HEADER,
    Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY_CACHES, Ranking.EVENT_DIRTY], bak, this.getGroupCriteria());
    return true;
  }

  toggleGroupSorting(col: Column) {
    return this.setGroupSortCriteria(this.toggleSortingLogic(col, this.groupSortCriteria));
  }

  setGroupSortCriteria(value: ISortCriteria | ISortCriteria[]) {
    const values = Array.isArray(value) ? value.slice() : [value];
    const bak = this.groupSortCriteria.slice();

    if (equalCriteria(values, bak)) {
      return false;
    }

    bak.forEach((d) => {
      d.col.on(Ranking.COLUMN_GROUP_SORT_DIRTY, null!);
    });

    values.forEach((d) => {
      d.col.on(Ranking.COLUMN_GROUP_SORT_DIRTY, this.dirtyOrderGroupSortDirty);
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
    col.attach(this);
    this.forward(col, ...Ranking.FORWARD_COLUMN_EVENTS);
    col.on(`${Ranking.EVENT_FILTER_CHANGED}.order`, this.dirtyOrderFiltering);
    col.on(`${Column.EVENT_VISIBILITY_CHANGED}.ranking`, (oldValue, newValue) => this.fire([Ranking.EVENT_COLUMN_VISIBILITY_CHANGED, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, oldValue, newValue));

    this.fire([Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, index);

    if (col.isFiltered()) {
      this.dirtyOrderFiltering();
    }
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

    this.unforward(col, ...Ranking.FORWARD_COLUMN_EVENTS);

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

    let newGrouping: Column[] | null = null;
    const isGroupColumn = this.groupColumns.indexOf(col);
    if (isGroupColumn >= 0) { // was my grouping criteria
      newGrouping = this.groupColumns.slice();
      newGrouping.splice(isGroupColumn, 1);
    }

    col.detach();
    this.columns.splice(i, 1);

    this.fire([Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, i);

    if (newGrouping) {
      this.setGroupCriteria(newGrouping);
    } else if (sortCriteriaChanged) {
      this.triggerResort(null);
    } else if (groupSortCriteriaChanged) {
      this.triggerGroupResort(null);
    } else if (col.isFiltered()) {
      this.dirtyOrderFiltering();
    }

    return true;
  }

  clear() {
    if (this.columns.length === 0) {
      return;
    }
    this.sortCriteria.forEach((d) => {
      d.col.on(`${Column.EVENT_DIRTY_CACHES}.order`, null!);
    });
    this.sortCriteria.splice(0, this.sortCriteria.length);
    this.groupSortCriteria.forEach((d) => {
      d.col.on(Ranking.COLUMN_GROUP_SORT_DIRTY, null!);
    });
    this.groupSortCriteria.splice(0, this.groupSortCriteria.length);

    this.groupColumns.forEach((d) => {
      d.on(Ranking.COLUMN_GROUP_DIRTY, null!);
    });
    this.groupColumns.splice(0, this.groupColumns.length);

    this.columns.forEach((col) => {
      this.unforward(col, ...Ranking.FORWARD_COLUMN_EVENTS);
      col.detach();
    });
    const removed = this.columns.splice(0, this.columns.length);
    this.fire([Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], removed);
  }

  get flatColumns(): Column[] {
    const r: IFlatColumn[] = [];
    this.flatten(r, 0, Column.FLAT_ALL_COLUMNS);
    return r.map((d) => d.col);
  }

  find(idOrFilter: string | ((col: Column) => boolean)) {
    const filter = typeof (idOrFilter) === 'string' ? (col: Column) => col.id === idOrFilter : idOrFilter;
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

  /**
   * marks the header, values, or both as dirty such that the values are reevaluated
   * @param type specify in more detail what is dirty, by default whole column
   */
  markDirty(type: 'header' | 'values' | 'all' = 'all') {
    switch (type) {
      case 'header':
        return this.fire([Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY]);
      case 'values':
        return this.fire([Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY]);
      default:
        return this.fire([Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY]);
    }
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
