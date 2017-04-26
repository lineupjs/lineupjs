/**
 * Created by Samuel Gratzl on 06.08.2015.
 */

import Column, {IColumnParent, fixCSS, IFlatColumn, IColumnDesc} from './Column';
import StringColumn from './StringColumn';
import StackColumn from './StackColumn';
import {AEventDispatcher} from '../utils';

export interface ISortCriteria {
  readonly col: Column;
  readonly asc: boolean;
}

export function isSupportType(col: IColumnDesc) {
  return ['rank', 'selection', 'actions'].indexOf(col.type) >= 0;
}

/**
 * a ranking
 */
export default class Ranking extends AEventDispatcher implements IColumnParent {
  static readonly EVENT_WIDTH_CHANGED = Column.EVENT_WIDTH_CHANGED;
  static readonly EVENT_FILTER_CHANGED = Column.EVENT_FILTER_CHANGED;
  static readonly EVENT_LABEL_CHANGED = Column.EVENT_LABEL_CHANGED;
  static readonly EVENT_COMPRESS_CHANGED = Column.EVENT_COMPRESS_CHANGED;
  static readonly EVENT_ADD_COLUMN = Column.EVENT_ADD_COLUMN;
  static readonly EVENT_REMOVE_COLUMN = Column.EVENT_REMOVE_COLUMN;
  static readonly EVENT_DIRTY = Column.EVENT_DIRTY;
  static readonly EVENT_DIRTY_HEADER = Column.EVENT_DIRTY_HEADER;
  static readonly EVENT_DIRTY_VALUES = Column.EVENT_DIRTY_VALUES;
  static readonly EVENT_SORT_CRITERIA_CHANGED = 'sortCriteriaChanged';
  static readonly EVENT_SORT_CRITERIAS_CHANGED = 'sortCriteriasChanged';
  static readonly EVENT_DIRTY_ORDER = 'dirtyOrder';
  static readonly EVENT_ORDER_CHANGED = 'orderChanged';


  /**
   * the list of sort criterias
   * @type {Array}
   */
  private readonly sortCriterias: ISortCriteria[] = [];

  /**
   * columns of this ranking
   * @type {Array}
   * @private
   */
  private readonly columns: Column[] = [];

  readonly comparator = (a: any, b: any, aIndex: number, bIndex: number) => {
    if (this.sortCriterias.length === 0) {
      return 0;
    }
    for (const sort of this.sortCriterias) {
      const r = sort.col.compare(a, b, aIndex, bIndex);
      if (r !== 0) {
        return sort.asc ? r : -r;
      }
    }
    return 0;
  }

  readonly dirtyOrder = () => {
    this.fire([Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], this.getSortCriteria());
  }

  /**
   * the current ordering as an sorted array of indices
   * @type {Array}
   */
  private order: number[] = [];

  constructor(public id: string, private readonly maxSortCriterias = 1) {
    super();
    this.id = fixCSS(id);
  }

  protected createEventList() {
    return super.createEventList().concat([
      Ranking.EVENT_WIDTH_CHANGED, Ranking.EVENT_FILTER_CHANGED,
      Ranking.EVENT_LABEL_CHANGED, Ranking.EVENT_COMPRESS_CHANGED,
      Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_REMOVE_COLUMN,
      Ranking.EVENT_DIRTY, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES,
      Ranking.EVENT_SORT_CRITERIA_CHANGED, Ranking.EVENT_SORT_CRITERIAS_CHANGED, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_ORDER_CHANGED]);
  }

  assignNewId(idGenerator: () => string) {
    this.id = fixCSS(idGenerator());
    this.columns.forEach((c) => c.assignNewId(idGenerator));
  }

  setOrder(order: number[]) {
    this.fire([Ranking.EVENT_ORDER_CHANGED, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], this.order, this.order = order);
  }

  getOrder() {
    return this.order;
  }

  dump(toDescRef: (desc: any) => any) {
    const r: any = {};
    r.columns = this.columns.map((d) => d.dump(toDescRef));
    r.sortCriterias = this.sortCriterias.map((s) => ({asc: s.asc, sortBy: s.col.id}));
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column) {
    this.clear();
    dump.columns.map((child) => {
      const c = factory(child);
      if (c) {
        this.push(c);
      }
    });
    // compatibility case
    if (dump.sortColumn) {
      if (dump.sortColumn.sortBy) {
        const help = this.columns.filter((d) => d.id === dump.sortColumn.sortBy);
        this.sortBy(help.length === 0 ? null : help[0], dump.sortColumn.asc);
      }
    }
    if (dump.sortCriterias) {
      const sortCriterias = dump.sortCriterias.map((s) => {
        return {
          asc: s.asc,
          col: this.columns.find((d) => d.id === dump.sortColumn) || null
        };
      });
      this.setSortCriterias(sortCriterias);
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

  private get primarySortCriteria(): ISortCriteria {
    if (this.sortCriterias.length === 0) {
      return {
        col: null,
        asc: false
      };
    }
    return this.sortCriterias[0];
  }

  getSortCriteria(): ISortCriteria {
    return Object.assign({}, this.primarySortCriteria);
  }

  getSortCriterias(): ISortCriteria[] {
    return this.sortCriterias.map((d) => Object.assign({}, d));
  }

  toggleSorting(col: Column) {
    const primary = this.primarySortCriteria;
    if (primary.col === col) {
      return this.sortBy(col, !primary.asc);
    }
    return this.sortBy(col);
  }

  setSortCriteria(value: ISortCriteria) {
    return this.sortBy(value.col, value.asc);
  }

  setSortCriterias(values: ISortCriteria[]) {
    if (values.length === 0) {
      return this.sortBy(null);
    } else if (values.length === 1) {
      return this.setSortCriteria(values[0]);
    }
    const bak = this.sortCriterias.slice();

    // update listener
    bak.forEach((d) => {
      d.col.on(Column.EVENT_DIRTY_VALUES + '.order', null);
      d.col.on(Column.EVENT_SORTMETHOD_CHANGED + '.order', null);
    });

    // trim
    if (values.length > this.maxSortCriterias) {
      values = values.slice(0, this.maxSortCriterias);
    }
    values.forEach((d) => {
      d.col.on(Column.EVENT_DIRTY_VALUES + '.order', this.dirtyOrder);
      d.col.on(Column.EVENT_SORTMETHOD_CHANGED + '.order', this.dirtyOrder);
    });
    this.sortCriterias.splice(0, this.sortCriterias.length, ...values.slice());
    this.triggerResort(bak);
  }

  sortBy(col: Column, ascending = false) {
    if (col !== null && col.findMyRanker() !== this) {
      return false; //not one of mine
    }
    const primary = this.primarySortCriteria;
    if (primary.col === col && primary.asc === ascending) {
      return true; //already in this order
    }
    const bak = this.getSortCriteria();

    if (col) {
      const existing = this.sortCriterias.findIndex((d) => d.col === col);
      if (existing >= 0) { //remove index
        this.sortCriterias.splice(existing, 1);
        // can skip deregister will be reregistered anyhow
      } else if (this.sortCriterias.length === this.maxSortCriterias) {
        // remove the last one
        const last = this.sortCriterias.pop();
        last.col.on(Column.EVENT_DIRTY_VALUES + '.order', null);
        last.col.on(Column.EVENT_SORTMETHOD_CHANGED + '.order', null);
      }
    } else {
      this.sortCriterias.forEach((s) => {
        s.col.on(Column.EVENT_DIRTY_VALUES + '.order', null);
        s.col.on(Column.EVENT_SORTMETHOD_CHANGED + '.order', null);
      });
      this.sortCriterias.splice(0, this.sortCriterias.length);
    }

    if (col) { //enable dirty listening
      // add as first
      this.sortCriterias.unshift({
        col,
        asc: ascending
      });
      col.on(Column.EVENT_DIRTY_VALUES + '.order', this.dirtyOrder);
      // order is dirty if the sort method has changed
      col.on(Column.EVENT_SORTMETHOD_CHANGED + '.order', this.dirtyOrder);
    }
    this.triggerResort(bak);
    return true;
  }

  private triggerResort(bak?: ISortCriteria|ISortCriteria[]) {
    const sortCriterias = this.getSortCriterias();
    const bakSingle = Array.isArray(bak) ? bak[0] : bak;
    const bakMulti = Array.isArray(bak)? bak: sortCriterias;
    this.fire([Ranking.EVENT_SORT_CRITERIA_CHANGED, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_HEADER,
      Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY],bakSingle, sortCriterias[0]);
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
    this.forward(col, Column.EVENT_DIRTY_VALUES + '.ranking', Column.EVENT_DIRTY_HEADER + '.ranking', Column.EVENT_DIRTY + '.ranking', Column.EVENT_FILTER_CHANGED + '.ranking');
    col.on(Ranking.EVENT_FILTER_CHANGED + '.order', this.dirtyOrder);


    this.fire([Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, index);

    if (this.sortCriterias.length === 0 && !isSupportType(col.desc)) {
      this.sortBy(col, col instanceof StringColumn);
    }
    return col;
  }

  get fqpath() {
    return '';
  }

  findByPath(fqpath: string): Column {
    let p: IColumnParent|Column = <any>this;
    const indices = fqpath.split('@').map(Number).slice(1); //ignore the first entry = ranking
    while (indices.length > 0) {
      const i = indices.shift();
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

    this.unforward(col, Column.EVENT_DIRTY_VALUES + '.ranking', Column.EVENT_DIRTY_HEADER + '.ranking', Column.EVENT_DIRTY + '.ranking', Column.EVENT_FILTER_CHANGED + '.ranking');

   const isSortCriteria = this.sortCriterias.findIndex((d) => d.col === col);
    if (isSortCriteria === 0) {
      this.sortCriterias.shift();
      // if multiple ones sort by previous one
      if (this.sortCriterias.length > 0) {
        this.sortBy(this.sortCriterias[0].col);
      } else {
        const next = this.columns.filter((d) => d !== col && !isSupportType(d.desc))[0];
        this.sortBy(next ? next : null);
      }
    } else if (isSortCriteria > 0) {
      // just remove and trigger restore
      this.sortCriterias.splice(isSortCriteria, 1);
      this.triggerResort();
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
    this.sortCriterias.splice(0, this.sortCriterias.length);
    this.columns.forEach((col) => {
      this.unforward(col, Column.EVENT_DIRTY_VALUES + '.ranking', Column.EVENT_DIRTY_HEADER + '.ranking', Column.EVENT_DIRTY + '.ranking', Column.EVENT_FILTER_CHANGED + '.ranking');
      col.parent = null;
    });
    this.columns.length = 0;
    this.fire([Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], null);
  }

  get flatColumns() {
    const r: IFlatColumn[] = [];
    this.flatten(r, 0, Column.FLAT_ALL_COLUMNS);
    return r.map((d) => d.col);
  }

  find(idOrFilter: string | ((col: Column) => boolean)) {
    const filter = typeof(idOrFilter) === 'string' ? (col) => col.id === idOrFilter : idOrFilter;
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
