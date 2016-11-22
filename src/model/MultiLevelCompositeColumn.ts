/**
 * Created by sam on 04.11.2016.
 */

import CompositeColumn, {IMultiLevelColumn} from './CompositeColumn';
import Column, {IFlatColumn} from './Column';
import StackColumn from './StackColumn';

export default class MultiLevelCompositeColumn extends CompositeColumn implements IMultiLevelColumn {
  static EVENT_COLLAPSE_CHANGED = StackColumn.EVENT_COLLAPSE_CHANGED;

  private adaptChange;

  /**
   * whether this stack column is collapsed i.e. just looks like an ordinary number column
   * @type {boolean}
   * @private
   */
  private collapsed = false;

  constructor(id: string, desc: any) {
    super(id, desc);
    const that = this;
    this.adaptChange = function (old, new_) {
      that.adaptWidthChange(this.source, old, new_);
    };
  }

  protected createEventList() {
    return super.createEventList().concat([MultiLevelCompositeColumn.EVENT_COLLAPSE_CHANGED]);
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

  restore(dump: any, factory: (dump: any) => Column) {
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
   * @param weight
   * @returns {any}
   */
  insert(col: Column, index: number) {
    col.on(Column.EVENT_WIDTH_CHANGED + '.stack', this.adaptChange);
    //increase my width
    super.setWidth(this.length === 0 ? col.getWidth() : (this.getWidth() + col.getWidth()));

    return super.insert(col, index);
  }

  /**
   * adapts weights according to an own width change
   * @param col
   * @param old
   * @param new_
   */
  private adaptWidthChange(col: Column, old: number, new_: number) {
    if (old === new_) {
      return;
    }
    super.setWidth(this.getWidth() + (new_ - old));
  }

  removeImpl(child: Column) {
    child.on(Column.EVENT_WIDTH_CHANGED + '.stack', null);
    super.setWidth(this.length === 1 ? 100 : this.getWidth() - child.getWidth());
    return super.removeImpl(child);
  }

  setWidth(value: number) {
    const factor = this.length / this.getWidth();
    this._children.forEach((child) => {
      //disable since we change it
      child.setWidthImpl(child.getWidth() * factor);
    });
    super.setWidth(value);
  }
}
