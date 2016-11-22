/**
 * Created by sam on 04.11.2016.
 */

import Column, {IColumnParent, IFlatColumn} from './Column';

export interface IMultiLevelColumn extends CompositeColumn {
  getCollapsed(): boolean;
  setCollapsed(value: boolean);
}

export function isMultiLevelColumn(col: Column) {
  return typeof ((<any>col).getCollapsed) === 'function';
}

/**
 * implementation of a combine column, standard operations how to select
 */
export default class CompositeColumn extends Column implements IColumnParent {
  protected _children: Column[] = [];

  constructor(id: string, desc: any) {
    super(id, desc);
  }

  assignNewId(idGenerator: () => string) {
    super.assignNewId(idGenerator);
    this._children.forEach((c) => c.assignNewId(idGenerator));
  }

  get children() {
    return this._children.slice();
  }

  get length() {
    return this._children.length;
  }

  flatten(r: IFlatColumn[], offset: number, levelsToGo = 0, padding = 0) {
    var self = null;
    //no more levels or just this one
    if (levelsToGo === 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      var w = this.getCompressed() ? Column.COMPRESSED_WIDTH : this.getWidth();
      r.push(self = {col: this, offset: offset, width: w});
      if (levelsToGo === 0) {
        return w;
      }
    }
    //push children
    this._children.forEach((c) => {
      if (!c.isHidden() || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
        c.flatten(r, offset, levelsToGo - 1, padding);
      }
    });
    return w;
  }

  dump(toDescRef: (desc: any) => any) {
    var r = super.dump(toDescRef);
    r.children = this._children.map((d) => d.dump(toDescRef));
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column) {
    dump.children.map((child) => {
      var c = factory(child);
      if (c) {
        this.push(c);
      }
    });
    super.restore(dump, factory);
  }

  /**
   * inserts a column at a the given position
   * @param col
   * @param index
   * @param weight
   * @returns {any}
   */
  insert(col: Column, index: number) {
    this._children.splice(index, 0, col);
    //listen and propagate events
    return this.insertImpl(col, index);
  }

  protected insertImpl(col: Column, index: number) {
    col.parent = this;
    this.forward(col, Column.EVENT_DIRTY_HEADER + '.combine', Column.EVENT_DIRTY_VALUES + '.combine', Column.EVENT_DIRTY + '.combine', Column.EVENT_FILTER_CHANGED + '.combine');
    this.fire([Column.EVENT_ADD_COLUMN, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], col, index);
    return col;
  }

  push(col: Column) {
    return this.insert(col, this._children.length);
  }

  at(index: number) {
    return this._children[index];
  }

  indexOf(col: Column) {
    return this._children.indexOf(col);
  }

  insertAfter(col: Column, ref: Column) {
    var i = this.indexOf(ref);
    if (i < 0) {
      return null;
    }
    return this.insert(col, i + 1);
  }

  remove(child: Column) {
    var i = this._children.indexOf(child);
    if (i < 0) {
      return false;
    }
    this._children.splice(i, 1); //remove and deregister listeners
    return this.removeImpl(child);
  }

  protected removeImpl(child: Column) {
    child.parent = null;
    this.unforward(child, Column.EVENT_DIRTY_HEADER + '.combine', Column.EVENT_DIRTY_VALUES + '.combine', Column.EVENT_DIRTY + '.combine', Column.EVENT_FILTER_CHANGED + '.combine');
    this.fire([Column.EVENT_REMOVE_COLUMN, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], child);
    return true;
  }

  getColor(row: any) {
    return this.color;
  }

  isFiltered() {
    return this._children.some((d) => d.isFiltered());
  }

  filter(row: any) {
    return this._children.every((d) => d.filter(row));
  }
}
