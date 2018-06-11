import {similar} from '../internal/math';
import {toolbar} from './annotations';
import Column, {IColumnDesc, IFlatColumn} from './Column';
import CompositeColumn, {IMultiLevelColumn, isMultiLevelColumn} from './CompositeColumn';
import {IDataRow} from './interfaces';
import {isNumberColumn} from './INumberColumn';
import StackColumn from './StackColumn';

@toolbar('collapse')
export default class MultiLevelCompositeColumn extends CompositeColumn implements IMultiLevelColumn {
  static readonly EVENT_COLLAPSE_CHANGED = StackColumn.EVENT_COLLAPSE_CHANGED;
  static readonly EVENT_MULTI_LEVEL_CHANGED = StackColumn.EVENT_MULTI_LEVEL_CHANGED;

  private readonly adaptChange: (old: number, newValue: number) => void;

  /**
   * whether this stack column is collapsed i.e. just looks like an ordinary number column
   * @type {boolean}
   * @private
   */
  private collapsed = false;

  constructor(id: string, desc: Readonly<IColumnDesc>) {
    super(id, desc);
    const that = this;
    this.adaptChange = function (old, newValue) {
      that.adaptWidthChange(old, newValue);
    };
  }

  protected createEventList() {
    return super.createEventList().concat([MultiLevelCompositeColumn.EVENT_COLLAPSE_CHANGED, MultiLevelCompositeColumn.EVENT_MULTI_LEVEL_CHANGED]);
  }

  setCollapsed(value: boolean) {
    if (this.collapsed === value) {
      return;
    }
    this.fire([StackColumn.EVENT_COLLAPSE_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.collapsed, this.collapsed = value);
  }

  getCollapsed() {
    return this.collapsed;
  }

  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.collapsed = this.collapsed;
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    this.collapsed = dump.collapsed === true;
    super.restore(dump, factory);
  }

  flatten(r: IFlatColumn[], offset: number, levelsToGo = 0, padding = 0) {
    return StackColumn.prototype.flatten.call(this, r, offset, levelsToGo, padding);
  }

  /**
   * inserts a column at a the given position
   * @param col
   * @param index
   */
  insert(col: Column, index: number) {
    col.on(`${Column.EVENT_WIDTH_CHANGED}.stack`, this.adaptChange);
    //increase my width
    super.setWidth(this.length === 0 ? col.getWidth() : (this.getWidth() + col.getWidth()));

    return super.insert(col, index);
  }

  /**
   * adapts weights according to an own width change
   * @param oldValue
   * @param newValue
   */
  private adaptWidthChange(oldValue: number, newValue: number) {
    if (similar(oldValue, newValue, 0.5)) {
      return;
    }
    const act = this.getWidth();
    const next = act + (newValue - oldValue);
    this.fire([MultiLevelCompositeColumn.EVENT_MULTI_LEVEL_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY], act, next);
    super.setWidth(next);
  }

  removeImpl(child: Column, index: number) {
    child.on(`${Column.EVENT_WIDTH_CHANGED}.stack`, null);
    super.setWidth(this.length === 0 ? 100 : this.getWidth() - child.getWidth());
    return super.removeImpl(child, index);
  }

  setWidth(value: number) {
    const act = this.getWidth();
    const factor = value / act;
    this._children.forEach((child) => {
      //disable since we change it
      child.setWidthImpl(child.getWidth() * factor);
    });
    if (!similar(act, value, 0.5)) {
      this.fire([MultiLevelCompositeColumn.EVENT_MULTI_LEVEL_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY], act, value);
    }
    super.setWidth(value);
  }

  getRenderer() {
    if (this.getCollapsed()) {
      return MultiLevelCompositeColumn.EVENT_COLLAPSE_CHANGED;
    }
    return super.getRenderer();
  }

  isMissing(row: IDataRow) {
    if (this.getCollapsed()) {
      return this._children.some((c) => (isNumberColumn(c) || isMultiLevelColumn(c)) && c.isMissing(row));
    }
    return false;
  }
}
