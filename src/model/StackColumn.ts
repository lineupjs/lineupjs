/**
 * Created by sam on 04.11.2016.
 */

import CompositeNumberColumn,{ICompositeNumberDesc} from './CompositeNumberColumn';
import {IMultiLevelColumn} from './CompositeColumn';
import Column, {IFlatColumn} from './Column';

/**
 * factory for creating a description creating a stacked column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'Combined') {
  return {type: 'stack', label};
}

/**
 * implementation of the stacked column
 */
export default class StackColumn extends CompositeNumberColumn implements IMultiLevelColumn {
  static readonly EVENT_COLLAPSE_CHANGED = 'collapseChanged';
  static readonly EVENT_WEIGHTS_CHANGED = 'weightsChanged';
  static readonly COLLAPSED_RENDERER = 'number';

  private readonly adaptChange;

  /**
   * whether this stack column is collapsed i.e. just looks like an ordinary number column
   * @type {boolean}
   * @private
   */
  private collapsed = false;

  constructor(id: string, desc: ICompositeNumberDesc) {
    super(id, desc);

    const that = this;
    this.adaptChange = function (oldValue, newValue) {
      that.adaptWidthChange(this.source, oldValue, newValue);
    };
  }

  protected createEventList() {
    return super.createEventList().concat([StackColumn.EVENT_COLLAPSE_CHANGED, StackColumn.EVENT_WEIGHTS_CHANGED]);
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

  flatten(r: IFlatColumn[], offset: number, levelsToGo = 0, padding = 0) {
    let self = null;
    const children = levelsToGo <= Column.FLAT_ALL_COLUMNS ? this._children : this._children.filter((c) => !c.isHidden());
    //no more levels or just this one
    if (levelsToGo === 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      let w = this.getCompressed() ? Column.COMPRESSED_WIDTH : this.getWidth();
      if (!this.collapsed && !this.getCompressed()) {
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

  restore(dump: any, factory: (dump: any) => Column) {
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
    col.on(Column.EVENT_WIDTH_CHANGED + '.stack', this.adaptChange);
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
    if (oldValue === newValue) {
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
      } else {
        const guess = c.getWidth() * factor;
        const w = isNaN(guess) || guess < 1 ? 0 : guess;
        c.setWidthImpl(w);
        return w;
      }
    });
    //adapt width if needed
    super.setWidth(widths.reduce((a, b) => a + b, 0));

    this.fire([StackColumn.EVENT_WEIGHTS_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getWeights());
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
    this.fire([StackColumn.EVENT_WEIGHTS_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, weights);

  }

  removeImpl(child: Column) {
    child.on(Column.EVENT_WIDTH_CHANGED + '.stack', null);
    super.setWidth(this.length === 0 ? 100 : this.getWidth() - child.getWidth());
    return super.removeImpl(child);
  }

  setWidth(value: number) {
    const factor = value / this.getWidth();
    this._children.forEach((child) => {
      //disable since we change it
      child.setWidthImpl(child.getWidth() * factor);
    });
    super.setWidth(value);
  }

  protected compute(row: any, index: number) {
    const w = this.getWidth();
    return this._children.reduce((acc, d) => acc + d.getValue(row, index) * (d.getWidth() / w), 0);
  }

  rendererType() {
    if (this.getCollapsed() && this.isLoaded()) {
      return StackColumn.COLLAPSED_RENDERER;
    }
    return super.getRendererType();
  }

  /**
   * describe the column if it is a sorting criteria
   * @param toId helper to convert a description to an id
   * @return {string} json compatible
   */
  toSortingDesc(toId: (desc: any) => string): any {
    const w = this.getWeights();
    return this._children.map((c, i) => ({weight: w[i], id: c.toSortingDesc(toId)}));
  }
}
