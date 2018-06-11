import {suffix} from '../internal/AEventDispatcher';
import {Category, toolbar} from './annotations';
import Column, {IColumnParent, IFlatColumn} from './Column';
import {IDataRow} from './interfaces';
import {isNumberColumn} from './INumberColumn';
import ValueColumn from './ValueColumn';

export function isMultiLevelColumn(col: Column): col is IMultiLevelColumn {
  return typeof ((<IMultiLevelColumn>col).getCollapsed) === 'function';
}

/**
 * implementation of a combine column, standard operations how to select
 */
@toolbar('compositeContained', 'splitCombined')
@Category('composite')
export default class CompositeColumn extends Column implements IColumnParent {
  protected readonly _children: Column[] = [];

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
    let w = 0;
    //no more levels or just this one
    if (levelsToGo === 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      w = this.getWidth();
      r.push({col: this, offset, width: w});
      if (levelsToGo === 0) {
        return w;
      }
    }
    //push children
    this._children.forEach((c) => {
      if (c.isVisible() && levelsToGo <= Column.FLAT_ALL_COLUMNS) {
        c.flatten(r, offset, levelsToGo - 1, padding);
      }
    });
    return w;
  }

  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.children = this._children.map((d) => d.dump(toDescRef));
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    dump.children.map((child: any) => {
      const c = factory(child);
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
   * @returns {any}
   */
  insert(col: Column, index: number): Column | null {
    if (!isNumberColumn(col) && this.canJustAddNumbers) { //indicator it is a number type
      return null;
    }
    this._children.splice(index, 0, col);
    //listen and propagate events
    return this.insertImpl(col, index);
  }

  move(col: Column, index: number): Column | null {
    if (col.parent !== this) { //not moving
      return null;
    }
    const old = this._children.indexOf(col);
    if (index === old) {
      // no move needed
      return col;
    }
    //delete first
    this._children.splice(old, 1);
    // adapt target index based on previous index, i.e shift by one
    this._children.splice(old < index ? index - 1 : index, 0, col);
    //listen and propagate events
    return this.moveImpl(col, index, old);
  }

  protected insertImpl(col: Column, index: number) {
    col.parent = this;
    this.forward(col, ...suffix('.combine', Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY, Column.EVENT_FILTER_CHANGED, Column.EVENT_RENDERER_TYPE_CHANGED, Column.EVENT_GROUP_RENDERER_TYPE_CHANGED));
    this.fire([Column.EVENT_ADD_COLUMN, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], col, index);
    return col;
  }

  protected moveImpl(col: Column, index: number, oldIndex: number) {
    this.fire([Column.EVENT_MOVE_COLUMN, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY, Column.EVENT_RENDERER_TYPE_CHANGED, Column.EVENT_GROUP_RENDERER_TYPE_CHANGED], col, index, oldIndex);
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
    const i = this.indexOf(ref);
    if (i < 0) {
      return null;
    }
    return this.insert(col, i + 1);
  }

  moveAfter(col: Column, ref: Column) {
    const i = this.indexOf(ref);
    if (i < 0) {
      return null;
    }
    return this.move(col, i + 1);
  }


  remove(child: Column) {
    const i = this._children.indexOf(child);
    if (i < 0) {
      return false;
    }
    this._children.splice(i, 1); //remove and deregister listeners
    return this.removeImpl(child, i);
  }

  protected removeImpl(child: Column, index: number) {
    child.parent = null;
    this.unforward(child, ...suffix('.combine', Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY, Column.EVENT_FILTER_CHANGED));
    this.fire([Column.EVENT_REMOVE_COLUMN, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], child, index);
    return true;
  }

  getColor(_row: IDataRow) {
    return this.color;
  }

  isFiltered() {
    return this._children.some((d) => d.isFiltered());
  }

  filter(row: IDataRow) {
    return this._children.every((d) => d.filter(row));
  }

  isLoaded(): boolean {
    return this._children.every((c) => !(c instanceof ValueColumn || c instanceof CompositeColumn) || (<ValueColumn<any> | CompositeColumn>c).isLoaded());
  }

  get canJustAddNumbers() {
    return false;
  }
}

export interface IMultiLevelColumn extends CompositeColumn {
  getCollapsed(): boolean;

  setCollapsed(value: boolean): void;
}
