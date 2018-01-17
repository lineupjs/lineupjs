/**
 * Created by Samuel Gratzl on 06.08.2015.
 */

import Column, {fixCSS, IColumnDesc, IColumnParent, IFlatColumn} from './Column';
import StringColumn from './StringColumn';
import {defaultGroup, IOrderedGroup, joinGroups} from './Group';
import {AEventDispatcher, equalArrays, suffix} from '../utils';
import {IGroupData} from '../ui/engine/interfaces';
import {isCategoricalColumn} from './ICategoricalColumn';

export interface ISortCriteria {
  readonly col: Column;
  readonly asc: boolean;
}

export function isSupportType(col: IColumnDesc) {
  return ['rank', 'selection', 'actions', 'aggregate', 'group'].indexOf(col.type) >= 0;
}

/**
 * a ranking
 */
export default class Ranking extends AEventDispatcher implements IColumnParent {
  static readonly EVENT_WIDTH_CHANGED = Column.EVENT_WIDTH_CHANGED;
  static readonly EVENT_FILTER_CHANGED = Column.EVENT_FILTER_CHANGED;
  static readonly EVENT_LABEL_CHANGED = Column.EVENT_LABEL_CHANGED;
  static readonly EVENT_ADD_COLUMN = Column.EVENT_ADD_COLUMN;
  static readonly EVENT_MOVE_COLUMN = Column.EVENT_MOVE_COLUMN;
  static readonly EVENT_REMOVE_COLUMN = Column.EVENT_REMOVE_COLUMN;
  static readonly EVENT_DIRTY = Column.EVENT_DIRTY;
  static readonly EVENT_DIRTY_HEADER = Column.EVENT_DIRTY_HEADER;
  static readonly EVENT_DIRTY_VALUES = Column.EVENT_DIRTY_VALUES;
  static readonly EVENT_COLUMN_VISBILITY_CHANGED = Column.EVENT_VISBILITY_CHANGED;
  static readonly EVENT_SORT_CRITERIA_CHANGED = 'sortCriteriaChanged';
  static readonly EVENT_GROUP_CRITERIA_CHANGED = 'groupCriteriaChanged';
  static readonly EVENT_GROUP_SORT_CRITERIA_CHANGED = 'groupSortCriteriaChanged';
  static readonly EVENT_SORT_CRITERIAS_CHANGED = 'sortCriteriasChanged';
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

  readonly comparator = (a: any, b: any, aIndex: number, bIndex: number) => {
    if (this.sortCriteria.length === 0) {
      return 0;
    }
    for (const sort of this.sortCriteria) {
      const r = sort.col!.compare(a, b, aIndex, bIndex);
      if (r !== 0) {
        return sort.asc ? r : -r;
      }
    }
    return aIndex - bIndex; //to have a deterministic order
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

  readonly grouper = (row: any, index: number) => {
    const g = this.groupColumns;
    switch(g.length) {
      case 0: return defaultGroup;
      case 1: return g[0].group(row, index);
      default:
        const groups = g.map((gi) => gi.group(row, index));
        return joinGroups(groups);
    }
  };

  readonly dirtyOrder = () => {
    this.fire([Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], this.getSortCriteria());
  };

  /**
   * the current ordering as an sorted array of indices
   * @type {Array}
   */
  private groups: IOrderedGroup[] = [Object.assign({order: <number[]>[]}, defaultGroup)];

  constructor(public id: string, private maxSortCriteria = 1, private maxGroupColumns = 1) {
    super();
    this.id = fixCSS(id);
  }

  protected createEventList() {
    return super.createEventList().concat([
      Ranking.EVENT_WIDTH_CHANGED, Ranking.EVENT_FILTER_CHANGED,
      Ranking.EVENT_LABEL_CHANGED, Ranking.EVENT_GROUPS_CHANGED,
      Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_MOVE_COLUMN,
      Ranking.EVENT_DIRTY, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES,
      Ranking.EVENT_GROUP_SORT_CRITERIA_CHANGED, Ranking.EVENT_COLUMN_VISBILITY_CHANGED,
      Ranking.EVENT_SORT_CRITERIA_CHANGED, Ranking.EVENT_SORT_CRITERIAS_CHANGED, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_ORDER_CHANGED]);
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
    r.sortCriterias = this.sortCriteria.map((s) => ({asc: s.asc, sortBy: s.col!.id}));
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
      const help = this.columns.filter((d) => d.id === dump.sortColumn.sortBy);
      this.sortBy(help.length === 0 ? null : help[0], dump.sortColumn.asc);
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

    if (dump.sortCriterias) {
      this.setSortCriteria(restoreSortCriteria(dump.sortCriterias));
    }

    if (dump.groupSortCriterias) {
      this.setGroupSortCriteria(restoreSortCriteria(dump.groupSortCriterias));
    }
  }

  flatten(r: IFlatColumn[], offset: number, levelsToGo = 0, padding = 0) {
    let acc = offset; // + this.getWidth() + padding;
    if (levelsToGo > 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      this.columns.forEach((c) => {
        if (!c.isHidden() || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
          acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
        }
      });
    }
    return acc - offset;
  }

  private get primarySortCriteria(): ISortCriteria | null {
    if (this.sortCriteria.length === 0) {
      return null;
    }
    return this.sortCriteria[0];
  }

  getSortCriteria(): ISortCriteria | null {
    const p = this.primarySortCriteria;
    return p === null ? null : Object.assign({}, p);
  }

  getSortCriterias(): ISortCriteria[] {
    return this.sortCriteria.map((d) => Object.assign({}, d));
  }

  getGroupSortCriteria(): ISortCriteria[] {
    return this.groupSortCriteria.map((d) => Object.assign({}, d));
  }

  toggleSorting(col: Column) {
    const categoricals = this.groupColumns.reduce((acc, d) => acc + (isCategoricalColumn(d) ? 1 : 0), 0);

    if (categoricals <= 0) {
      const primary = this.primarySortCriteria;
      if (primary && primary.col === col) {
        return this.sortBy(col, !primary.asc);
      }
      return this.sortBy(col);
    }

    // need to preserve synced order
    const old = this.sortCriteria.findIndex((d) => d.col === col);
    const newSort = this.sortCriteria.slice();
    if (old > 0 && old === categoricals) {
      // kind of primary -> toggle
      newSort[old] = {col, asc: !newSort[old].asc};
    } else if (old > 0) {
      //remove
      newSort.splice(old, 1);
    } else {
      newSort.splice(categoricals, 0, {col, asc: false});
    }
    return this.setSortCriteria(newSort);
  }

  toggleGrouping(col: Column) {
    const old = this.groupColumns.indexOf(col);
    if (old >= 0) {
      const newGroupings = this.groupColumns.slice();
      newGroupings.splice(old, 1);
      if (isCategoricalColumn(col) && this.sortCriteria[old] && this.sortCriteria[old].col === col) {
        // categorical synced sorting
        this.sortCriteria.splice(old, 1);
      }
      return this.groupBy(newGroupings);
    }
    if (isCategoricalColumn(col)) {
      // sync with sorting
      const oldSort = this.sortCriteria.findIndex((d) => d.col === col);
      if (oldSort >= 0) {
        this.sortCriteria.splice(oldSort, 1);
      }
      this.setSortCriteria([{col: <Column>col, asc: true}].concat(this.sortCriteria));
    }
    return this.groupBy([col].concat(this.groupColumns));
  }

  getGroupCriteria() {
    return this.groupColumns.slice();
  }

  setGroupCriteria(columns: Column[]) {
    return this.groupBy(columns);
  }

  sortBy(col: Column | null, ascending: boolean = false) {
    if (col !== null && col.findMyRanker() !== this) {
      return false; //not one of mine
    }
    const primary = this.primarySortCriteria;
    if ((col === null && primary === null) || (primary && primary.col === col && primary.asc === ascending)) {
      return true; //already in this order
    }
    const bak = this.getSortCriteria();

    if (col) {
      const existing = this.sortCriteria.findIndex((d) => d.col === col);
      if (existing >= 0) { //remove index
        this.sortCriteria.splice(existing, 1);
        // can skip deregister will be reregistered anyhow
      } else if (this.sortCriteria.length === this.maxSortCriteria) {
        // remove the last one
        const last = this.sortCriteria.pop()!;
        last.col.on(`${Column.EVENT_DIRTY_VALUES}.order`, null);
        last.col.on(`${Column.EVENT_SORTMETHOD_CHANGED}.order`, null);
      }
    } else {
      this.sortCriteria.forEach((s) => {
        s.col.on(`${Column.EVENT_DIRTY_VALUES}.order`, null);
        s.col.on(`${Column.EVENT_SORTMETHOD_CHANGED}.order`, null);
      });
      this.sortCriteria.splice(0, this.sortCriteria.length);
    }

    if (col) { //enable dirty listening
      // add as first
      this.sortCriteria.unshift({
        col,
        asc: ascending
      });
      col.on(`${Column.EVENT_DIRTY_VALUES}.order`, this.dirtyOrder);
      // order is dirty if the sort method has changed
      col.on(`${Column.EVENT_SORTMETHOD_CHANGED}.order`, this.dirtyOrder);
    }
    this.triggerResort(bak);
    return true;
  }

  groupBy(col: Column | null | Column[]) {
    let cols = Array.isArray(col) ? col : (col instanceof Column ? [col] : []);
    // trim
    if (cols.length > this.maxGroupColumns) {
      cols = cols.slice(0, this.maxGroupColumns);
    }

    if (equalArrays(this.groupColumns, cols)) {
      return true; //same
    }
    this.groupColumns.forEach((groupColumn) => {
      groupColumn.on(suffix('.group', Column.EVENT_DIRTY_VALUES, Column.EVENT_SORTMETHOD_CHANGED, Column.EVENT_GROUPING_CHANGED), null);
    });

    const bak = this.groupColumns.slice();
    this.groupColumns.splice(0, this.groupColumns.length, ...cols);

    this.groupColumns.forEach((groupColumn) => {
      groupColumn.on(suffix('.group', Column.EVENT_DIRTY_VALUES, Column.EVENT_SORTMETHOD_CHANGED, Column.EVENT_GROUPING_CHANGED), this.dirtyOrder);
    });

    this.fire([Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_HEADER,
      Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], bak, this.getGroupCriteria());
    return true;
  }

  setSortCriteria(value: ISortCriteria | ISortCriteria[]) {
    let values = Array.isArray(value) ? value : [value];
    // trim
    if (values.length > this.maxSortCriteria) {
      values = values.slice(0, this.maxSortCriteria);
    }

    if (values.length === 0) {
      return this.sortBy(null);
    }
    if (values.length === 1) {
      return this.sortBy(values[0].col, values[0].asc);
    }
    const bak = this.sortCriteria.slice();

    // update listener
    bak.forEach((d) => {
      d.col.on(`${Column.EVENT_DIRTY_VALUES}.order`, null!);
      d.col.on(`${Column.EVENT_SORTMETHOD_CHANGED}.order`, null!);
    });

    values.forEach((d) => {
      d.col.on(`${Column.EVENT_DIRTY_VALUES}.order`, this.dirtyOrder);
      d.col.on(`${Column.EVENT_SORTMETHOD_CHANGED}.order`, this.dirtyOrder);
    });
    this.sortCriteria.splice(0, this.sortCriteria.length, ...values.slice());
    this.triggerResort(bak);
    return true;
  }

  toggleGroupSorting(col: Column) {
    const first = this.groupSortCriteria[0];
    const asc = first && first.col === col && !first.asc;
    return this.setGroupSortCriteria({col, asc});
  }

  groupSortBy(col: Column, asc: boolean) {
    return this.setGroupSortCriteria({col, asc});
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
    let values = Array.isArray(value) ? value : [value];
    // trim
    if (values.length > this.maxSortCriteria) {
      values = values.slice(0, this.maxSortCriteria);
    }

    this.groupSortCriteria.forEach((d) => {
      d.col.on(`${Column.EVENT_SORTMETHOD_CHANGED}.groupOrder`, null!);
    });

    values.forEach((d) => {
      d.col.on(`${Column.EVENT_SORTMETHOD_CHANGED}.groupOrder`, this.dirtyOrder);
    });
    this.groupSortCriteria.splice(0, this.groupSortCriteria.length, ...values.slice());
    this.triggerResort(this.sortCriteria.slice());
    return true;
  }

  private triggerResort(bak: ISortCriteria | ISortCriteria[] | null) {
    const sortCriterias = this.getSortCriterias();
    const bakSingle = Array.isArray(bak) ? bak[0] : bak;
    const bakMulti = Array.isArray(bak) ? bak : sortCriterias;
    this.fire([Ranking.EVENT_SORT_CRITERIA_CHANGED, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_HEADER,
      Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], bakSingle, sortCriterias[0]);
    this.fire(Ranking.EVENT_SORT_CRITERIAS_CHANGED, bakMulti, sortCriterias);
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
    this.forward(col, ...suffix('.ranking', Column.EVENT_VISBILITY_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY, Column.EVENT_FILTER_CHANGED));
    col.on(`${Ranking.EVENT_FILTER_CHANGED}.order`, this.dirtyOrder);


    this.fire([Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, index);

    if (this.sortCriteria.length === 0 && !isSupportType(col.desc)) {
      this.sortBy(col, col instanceof StringColumn);
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
    this.columns.splice(old < index ? index -1 : index, 0, col);

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

    this.unforward(col, ...suffix('.ranking', Column.EVENT_VISBILITY_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY, Column.EVENT_FILTER_CHANGED));

    const isSortCriteria = this.sortCriteria.findIndex((d) => d.col === col);
    if (isSortCriteria === 0) {
      this.sortCriteria.shift();
      // if multiple ones sort by previous one
      if (this.sortCriteria.length > 0) {
        this.sortBy(this.sortCriteria[0].col);
      } else {
        const next = this.columns.filter((d) => d !== col && !isSupportType(d.desc))[0];
        this.sortBy(next ? next : null);
      }
    } else if (isSortCriteria > 0) {
      // just remove and trigger restore
      this.sortCriteria.splice(isSortCriteria, 1);
      this.triggerResort(null);
    }

    const isGroupColumn = this.groupColumns.indexOf(col);
    if (isGroupColumn >= 0) { // was my grouping criteria
      const newGrouping = this.groupColumns.slice();
      newGrouping.splice(isGroupColumn, 1);
      this.groupBy(newGrouping);
    }

    col.parent = null;
    this.columns.splice(i, 1);

    this.fire([Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, i);
    return true;
  }

  clear() {
    if (this.columns.length === 0) {
      return;
    }
    this.sortCriteria.splice(0, this.sortCriteria.length);

    this.groupColumns.forEach((groupColumn) => {
      groupColumn.on(`${Column.EVENT_DIRTY_VALUES}.group`, null);
      groupColumn.on(`${Column.EVENT_SORTMETHOD_CHANGED}.group`, null);
    });
    this.groupColumns.splice(0, this.groupColumns.length);

    this.columns.forEach((col) => {
      this.unforward(col, ...suffix('.ranking', Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY, Column.EVENT_FILTER_CHANGED));
      col.parent = null;
    });
    this.columns.length = 0;
    this.fire([Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], null);
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

  /**
   * converts the sorting criteria to a json compatible notation for transferring it to the server
   * @param toId
   */
  toSortingDesc(toId: (desc: any) => string) {
    //TODO describe also all the filter settings
    const resolve = (s: Column): any => {
      if (s === null) {
        return null;
      }
      return s.toSortingDesc(toId);
    };
    const primary = this.primarySortCriteria;
    if (primary === null) {
      return null;
    }
    const id = resolve(primary.col);
    if (id === null) {
      return null;
    }
    return {
      id,
      asc: primary.asc
    };
  }

  isFiltered() {
    return this.columns.some((d) => d.isFiltered());
  }

  filter(row: any, index: number) {
    return this.columns.every((d) => d.filter(row, index));
  }

  findMyRanker() {
    return this;
  }

  get fqid() {
    return this.id;
  }
}
