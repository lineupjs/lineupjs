import { suffix, type IEventListener } from '../internal';
import Column, {
  widthChanged,
  labelChanged,
  metaDataChanged,
  dirty,
  dirtyHeader,
  dirtyValues,
  rendererTypeChanged,
  groupRendererChanged,
  summaryRendererChanged,
  visibilityChanged,
  dirtyCaches,
} from './Column';
import { Category, toolbar } from './annotations';
import type { IDataRow, IColumnParent, IFlatColumn, ITypeFactory, IColumnDump } from './interfaces';
import ValueColumn from './ValueColumn';
import { isNumberColumn } from './INumberColumn';

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

  protected override createEventList() {
    return super
      .createEventList()
      .concat([
        CompositeColumn.EVENT_FILTER_CHANGED,
        CompositeColumn.EVENT_ADD_COLUMN,
        CompositeColumn.EVENT_MOVE_COLUMN,
        CompositeColumn.EVENT_REMOVE_COLUMN,
      ]);
  }

  override on(type: typeof CompositeColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
  override on(type: typeof CompositeColumn.EVENT_ADD_COLUMN, listener: typeof addColumn | null): this;
  override on(type: typeof CompositeColumn.EVENT_MOVE_COLUMN, listener: typeof moveColumn | null): this;
  override on(type: typeof CompositeColumn.EVENT_REMOVE_COLUMN, listener: typeof removeColumn | null): this;
  override on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  override on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  override on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  override on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  override on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  override on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  override on(type: typeof Column.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  override on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  override on(
    type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED,
    listener: typeof groupRendererChanged | null
  ): this;
  override on(
    type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED,
    listener: typeof summaryRendererChanged | null
  ): this;
  override on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  override on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  override on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }

  override assignNewId(idGenerator: () => string) {
    super.assignNewId(idGenerator);
    this._children.forEach((c) => c.assignNewId(idGenerator));
  }

  get children() {
    return this._children.slice();
  }

  get length() {
    return this._children.length;
  }

  override flatten(r: IFlatColumn[], offset: number, levelsToGo = 0, padding = 0) {
    let w = 0;
    //no more levels or just this one
    if (levelsToGo === 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      w = this.getWidth();
      r.push({ col: this, offset, width: w });
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

  override dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    this._children.forEach((ci, i) => {
      r.children[i].desc = toDescRef(ci.desc);
    });
    return r;
  }

  override toJSON() {
    const r = super.toJSON();
    r.children = this._children.map((d) => d.toJSON());
    return r;
  }

  override restore(dump: IColumnDump, factory: ITypeFactory): Set<string> {
    const changed = super.restore(dump, factory);
    const lookup = new Map(this._children.map((d, i) => [d.id, { column: d, i }]));

    let structureChanged = false;
    const target = (dump.children as IColumnDump[]).map((child: IColumnDump, i) => {
      const existing = lookup.get(child.id);
      if (existing != null) {
        lookup.delete(child.id);
        if (existing.i !== i) {
          structureChanged = true;
          changed.add(CompositeColumn.EVENT_MOVE_COLUMN);
          changed.add(Column.EVENT_RENDERER_TYPE_CHANGED);
          changed.add(Column.EVENT_GROUP_RENDERER_TYPE_CHANGED);
        }
        const subChanged = existing.column.restore(child, factory);
        subChanged.forEach((c) => changed.add(c));
        return existing.column;
      }
      // need new
      const c = factory(child);
      this.insertImpl(c, i);
      structureChanged = true;
      changed.add(CompositeColumn.EVENT_ADD_COLUMN);
      return c;
    });
    this._children.forEach((c, i) => {
      if (lookup.has(c.id)) {
        // used
        return;
      }
      // remove
      structureChanged = true;
      changed.add(CompositeColumn.EVENT_REMOVE_COLUMN);
      this.removeImpl(c, i);
    });
    if (structureChanged) {
      this._children.splice(0, this._children.length);
      this._children.push(...target);
      changed.add(Column.EVENT_DIRTY_HEADER);
      changed.add(Column.EVENT_DIRTY_VALUES);
      changed.add(Column.EVENT_DIRTY_CACHES);
      changed.add(Column.EVENT_DIRTY);
    }
    return changed;
  }

  /**
   * inserts a column at a the given position
   * @param col
   * @param index
   * @returns {any}
   */
  insert(col: Column, index: number): Column | null {
    if (!isNumberColumn(col) && this.canJustAddNumbers) {
      //indicator it is a number type
      return null;
    }

    this._children.splice(index, 0, col);
    //listen and propagate events
    const r = this.insertImpl(col, index);
    this.fire(
      [
        CompositeColumn.EVENT_ADD_COLUMN,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
      ],
      col,
      index
    );
    return r;
  }

  move(col: Column, index: number): Column | null {
    if (col.parent !== this) {
      //not moving
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
    this.fire(
      [
        CompositeColumn.EVENT_MOVE_COLUMN,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
        Column.EVENT_RENDERER_TYPE_CHANGED,
        Column.EVENT_GROUP_RENDERER_TYPE_CHANGED,
      ],
      col,
      index,
      old
    );
    return col;
  }

  protected insertImpl(col: Column, _index: number) {
    col.attach(this);
    this.forward(
      col,
      ...suffix(
        '.combine',
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
        CompositeColumn.EVENT_FILTER_CHANGED,
        Column.EVENT_RENDERER_TYPE_CHANGED,
        Column.EVENT_GROUP_RENDERER_TYPE_CHANGED
      )
    );
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

  insertBefore(col: Column, ref: Column) {
    const i = this.indexOf(ref);
    if (i < 0) {
      return null;
    }
    return this.insert(col, i);
  }

  moveBefore(col: Column, ref: Column) {
    const i = this.indexOf(ref);
    if (i < 0) {
      return null;
    }
    return this.move(col, i);
  }

  remove(col: Column) {
    const i = this._children.indexOf(col);
    if (i < 0) {
      return false;
    }
    this._children.splice(i, 1); //remove and deregister listeners
    const r = this.removeImpl(col, i);
    this.fire(
      [
        CompositeColumn.EVENT_REMOVE_COLUMN,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
      ],
      col,
      i
    );
    return r;
  }

  protected removeImpl(col: Column, _index: number) {
    col.detach();
    this.unforward(
      col,
      ...suffix(
        '.combine',
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
        CompositeColumn.EVENT_FILTER_CHANGED
      )
    );
    return true;
  }

  override isFiltered() {
    return this._children.some((d) => d.isFiltered());
  }

  override clearFilter() {
    return this._children.map((d) => d.clearFilter()).some((d) => d);
  }

  override filter(row: IDataRow) {
    return this._children.every((d) => d.filter(row));
  }

  isLoaded(): boolean {
    return this._children.every(
      (c) =>
        !(c instanceof ValueColumn || c instanceof CompositeColumn) ||
        (c as ValueColumn<any> | CompositeColumn).isLoaded()
    );
  }

  get canJustAddNumbers() {
    return false;
  }
}
