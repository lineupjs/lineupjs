import {suffix, IEventListener} from '../internal';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged, dirtyCaches} from './Column';
import {Category, toolbar} from './annotations';
import {IDataRow, IColumnParent, IFlatColumn, ITypeFactory} from './interfaces';
import {isNumberColumn} from './INumberColumn';
import ValueColumn from './ValueColumn';

/**
 * emitted when the filter property changes
 * @asMemberOf CompositeColumn
 * @event
 */
export declare function filterChanged(previous: any | null, current: any | null): void;

/**
 * emitted when a column has been added
 * @asMemberOf CompositeColumn
 * @event
 */
export declare function addColumn(col: Column, index: number): void;

/**
 * emitted when a column has been moved within this composite columm
 * @asMemberOf CompositeColumn
 * @event
 */
export declare function moveColumn(col: Column, index: number, oldIndex: number): void;

/**
 * emitted when a column has been removed
 * @asMemberOf CompositeColumn
 * @event
 */
export declare function removeColumn(col: Column, index: number): void;

/**
 * implementation of a combine column, standard operations how to select
 */
@toolbar('compositeContained', 'splitCombined')
@Category('composite')
export default class CompositeColumn extends Column implements IColumnParent {
  static readonly EVENT_FILTER_CHANGED = 'filterChanged';
  static readonly EVENT_ADD_COLUMN = 'addColumn';
  static readonly EVENT_MOVE_COLUMN = 'moveColumn';
  static readonly EVENT_REMOVE_COLUMN = 'removeColumn';

  protected readonly _children: Column[] = [];

  protected createEventList() {
    return super.createEventList().concat([CompositeColumn.EVENT_FILTER_CHANGED, CompositeColumn.EVENT_ADD_COLUMN, CompositeColumn.EVENT_MOVE_COLUMN, CompositeColumn.EVENT_REMOVE_COLUMN]);
  }

  on(type: typeof CompositeColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
  on(type: typeof CompositeColumn.EVENT_ADD_COLUMN, listener: typeof addColumn | null): this;
  on(type: typeof CompositeColumn.EVENT_MOVE_COLUMN, listener: typeof moveColumn | null): this;
  on(type: typeof CompositeColumn.EVENT_REMOVE_COLUMN, listener: typeof removeColumn | null): this;
  on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Column.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
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

  restore(dump: any, factory: ITypeFactory) {
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
    col.attach(this);
    this.forward(col, ...suffix('.combine', Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY, CompositeColumn.EVENT_FILTER_CHANGED, Column.EVENT_RENDERER_TYPE_CHANGED, Column.EVENT_GROUP_RENDERER_TYPE_CHANGED));
    this.fire([CompositeColumn.EVENT_ADD_COLUMN, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY], col, index);
    return col;
  }

  protected moveImpl(col: Column, index: number, oldIndex: number) {
    this.fire([CompositeColumn.EVENT_MOVE_COLUMN, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY, Column.EVENT_RENDERER_TYPE_CHANGED, Column.EVENT_GROUP_RENDERER_TYPE_CHANGED], col, index, oldIndex);
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


  remove(col: Column) {
    const i = this._children.indexOf(col);
    if (i < 0) {
      return false;
    }
    this._children.splice(i, 1); //remove and deregister listeners
    return this.removeImpl(col, i);
  }

  protected removeImpl(col: Column, index: number) {
    col.detach();
    this.unforward(col, ...suffix('.combine', Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY, CompositeColumn.EVENT_FILTER_CHANGED));
    this.fire([CompositeColumn.EVENT_REMOVE_COLUMN, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY], col, index);
    return true;
  }

  isFiltered() {
    return this._children.some((d) => d.isFiltered());
  }

  clearFilter() {
    return this._children.map((d) => d.clearFilter()).some((d) => d);
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
