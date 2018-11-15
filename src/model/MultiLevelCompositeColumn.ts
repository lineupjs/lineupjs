import {similar} from '../internal/math';
import {toolbar} from './annotations';
import Column, {IColumnDesc, IFlatColumn, widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import CompositeColumn, {IMultiLevelColumn, isMultiLevelColumn, addColumn, filterChanged, moveColumn, removeColumn} from './CompositeColumn';
import {IDataRow} from './interfaces';
import {isNumberColumn} from './INumberColumn';
import StackColumn from './StackColumn';
import {IEventListener} from '../internal/AEventDispatcher';


/**
 * emitted when the collapse property changes
 * @asMemberOf MultiLevelCompositeColumn
 * @event
 */
export declare function collapseChanged(previous: boolean, current: boolean): void;

/**
 * emitted when the ratios between the children changes
 * @asMemberOf MultiLevelCompositeColumn
 * @event
 */
export declare function nestedChildRatio(previous: number, current: number): void;


@toolbar('compress', 'expand')
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

  on(type: typeof MultiLevelCompositeColumn.EVENT_COLLAPSE_CHANGED, listener: typeof collapseChanged | null): this;
  on(type: typeof MultiLevelCompositeColumn.EVENT_MULTI_LEVEL_CHANGED, listener: typeof nestedChildRatio | null): this;
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
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
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

  getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    if (format === 'json') {
      return {
        children: this.children.map((d) => d.getExportValue(row, format))
      };
    }
    return super.getExportValue(row, format);
  }
}
