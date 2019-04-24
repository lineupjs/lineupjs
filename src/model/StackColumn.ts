import {round, IEventListener, similar} from '../internal';
import {toolbar} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged, dirtyCaches} from './Column';
import CompositeColumn, {addColumn, filterChanged, moveColumn, removeColumn} from './CompositeColumn';
import CompositeNumberColumn, {ICompositeNumberDesc} from './CompositeNumberColumn';
import {IDataRow, IFlatColumn, IMultiLevelColumn} from './interfaces';

/**
 * factory for creating a description creating a stacked column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createStackDesc(label: string = 'Weighted Sum') {
  return {type: 'stack', label};
}


/**
 * emitted when the collapse property changes
 * @asMemberOf StackColumn
 * @event
 */
export declare function collapseChanged(previous: boolean, current: boolean): void;


/**
 * emitted when the weights change
 * @asMemberOf StackColumn
 * @event
 */
export declare function weightsChanged(previous: number[], current: number[]): void;


/**
 * emitted when the ratios between the children changes
 * @asMemberOf StackColumn
 * @event
 */
export declare function nestedChildRatio(previous: number[], current: number[]): void;

/**
 * implementation of the stacked column
 */
@toolbar('editWeights', 'compress', 'expand')
export default class StackColumn extends CompositeNumberColumn implements IMultiLevelColumn {
  static readonly EVENT_COLLAPSE_CHANGED = 'collapseChanged';
  static readonly EVENT_WEIGHTS_CHANGED = 'weightsChanged';
  static readonly EVENT_MULTI_LEVEL_CHANGED = 'nestedChildRatio';

  static readonly COLLAPSED_RENDERER = 'number';

  private readonly adaptChange: (old: number, newValue: number) => void;

  /**
   * whether this stack column is collapsed i.e. just looks like an ordinary number column
   * @type {boolean}
   * @private
   */
  private collapsed = false;

  constructor(id: string, desc: ICompositeNumberDesc) {
    super(id, desc);

    const that = this;
    this.adaptChange = function (this: {source: Column}, oldValue, newValue) {
      that.adaptWidthChange(this.source, oldValue, newValue);
    };

    this.setDefaultRenderer('stack');
    this.setDefaultGroupRenderer('stack');
    this.setDefaultSummaryRenderer('default');
  }

  get label() {
    const l = super.getMetaData().label;
    const c = this._children;
    if (l !== 'Weighted Sum' || c.length === 0) {
      return l;
    }
    const weights = this.getWeights();
    return c.map((c, i) => `${c.label} (${round(100 * weights[i], 1)}%)`).join(' + ');
  }

  protected createEventList() {
    return super.createEventList().concat([StackColumn.EVENT_COLLAPSE_CHANGED, StackColumn.EVENT_WEIGHTS_CHANGED, StackColumn.EVENT_MULTI_LEVEL_CHANGED]);
  }

  on(type: typeof StackColumn.EVENT_COLLAPSE_CHANGED, listener: typeof collapseChanged | null): this;
  on(type: typeof StackColumn.EVENT_WEIGHTS_CHANGED, listener: typeof weightsChanged | null): this;
  on(type: typeof StackColumn.EVENT_MULTI_LEVEL_CHANGED, listener: typeof nestedChildRatio | null): this;
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

  setCollapsed(value: boolean) {
    if (this.collapsed === value) {
      return;
    }
    this.fire([StackColumn.EVENT_COLLAPSE_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.collapsed, this.collapsed = value);
  }

  getCollapsed() {
    return this.collapsed;
  }

  get canJustAddNumbers() {
    return true;
  }

  flatten(r: IFlatColumn[], offset: number, levelsToGo = 0, padding = 0) {
    let self = null;
    const children = levelsToGo <= Column.FLAT_ALL_COLUMNS ? this._children : this._children.filter((c) => c.isVisible());
    //no more levels or just this one
    if (levelsToGo === 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      let w = this.getWidth();
      if (!this.collapsed) {
        w += (children.length - 1) * padding;
      }
      r.push(self = {col: this, offset, width: w});
      if (levelsToGo === 0) {
        return w;
      }
    }
    //push children
    let acc = offset;
    children.forEach((c) => {
      acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
    });
    if (self) { //nesting my even increase my width
      self.width = acc - offset - padding;
    }
    return acc - offset - padding;
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

  /**
   * inserts a column at a the given position
   */
  insert(col: Column, index: number, weight = NaN) {
    if (!isNaN(weight)) {
      col.setWidth((weight / (1 - weight) * this.getWidth()));
    }
    col.on(`${Column.EVENT_WIDTH_CHANGED}.stack`, this.adaptChange);
    //increase my width
    super.setWidth(this.length === 0 ? col.getWidth() : (this.getWidth() + col.getWidth()));

    return super.insert(col, index);
  }

  push(col: Column, weight = NaN) {
    return this.insert(col, this.length, weight);
  }

  insertAfter(col: Column, ref: Column, weight = NaN) {
    const i = this.indexOf(ref);
    if (i < 0) {
      return null;
    }
    return this.insert(col, i + 1, weight);
  }

  /**
   * adapts weights according to an own width change
   * @param col
   * @param oldValue
   * @param newValue
   */
  private adaptWidthChange(col: Column, oldValue: number, newValue: number) {
    if (similar(oldValue, newValue, 0.5)) {
      return;
    }
    const bak = this.getWeights();
    const full = this.getWidth(),
      change = (newValue - oldValue) / full;
    const oldWeight = oldValue / full;
    const factor = (1 - oldWeight - change) / (1 - oldWeight);
    const widths = this._children.map((c) => {
      if (c === col) {
        //c.weight += change;
        return newValue;
      }
      const guess = c.getWidth() * factor;
      const w = isNaN(guess) || guess < 1 ? 0 : guess;
      c.setWidthImpl(w);
      return w;
    });
    //adapt width if needed
    super.setWidth(widths.reduce((a, b) => a + b, 0));

    this.fire([StackColumn.EVENT_WEIGHTS_CHANGED, StackColumn.EVENT_MULTI_LEVEL_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY], bak, this.getWeights());
  }

  getWeights() {
    const w = this.getWidth();
    return this._children.map((d) => d.getWidth() / w);
  }

  setWeights(weights: number[]) {
    const bak = this.getWeights();
    const delta = weights.length - this.length;
    let s: number;
    if (delta < 0) {
      s = weights.reduce((p, a) => p + a, 0);
      if (s <= 1) {
        for (let i = 0; i < -delta; ++i) {
          weights.push((1 - s) * (1 / -delta));
        }
      } else if (s <= 100) {
        for (let i = 0; i < -delta; ++i) {
          weights.push((100 - s) * (1 / -delta));
        }
      }
    }
    weights = weights.slice(0, this.length);
    s = weights.reduce((p, a) => p + a, 0) / this.getWidth();
    weights = weights.map((d) => d / s);

    this._children.forEach((c, i) => {
      c.setWidthImpl(weights[i]);
    });
    this.fire([StackColumn.EVENT_WEIGHTS_CHANGED, StackColumn.EVENT_MULTI_LEVEL_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY], bak, weights);

  }

  removeImpl(child: Column, index: number) {
    child.on(`${Column.EVENT_WIDTH_CHANGED}.stack`, null);
    super.setWidth(this.length === 0 ? 100 : this.getWidth() - child.getWidth());
    return super.removeImpl(child, index);
  }

  setWidth(value: number) {
    const factor = value / this.getWidth();
    this._children.forEach((child) => {
      //disable since we change it
      child.setWidthImpl(child.getWidth() * factor);
    });
    super.setWidth(value);
  }

  protected compute(row: IDataRow) {
    const w = this.getWidth();
    return this._children.reduce((acc, d) => acc + d.getValue(row) * (d.getWidth() / w), 0);
  }

  getRenderer() {
    if (this.getCollapsed() && this.isLoaded()) {
      return StackColumn.COLLAPSED_RENDERER;
    }
    return super.getRenderer();
  }

  getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    if (format === 'json') {
      return {
        value: this.getRawNumber(row),
        children: this.children.map((d) => d.getExportValue(row, format))
      };
    }
    return super.getExportValue(row, format);
  }
}
