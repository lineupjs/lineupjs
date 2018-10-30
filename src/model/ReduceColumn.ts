import {median, quantile} from 'd3-array';
import {toolbar} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import CompositeColumn, {addColumn, filterChanged, moveColumn, removeColumn} from './CompositeColumn';
import CompositeNumberColumn, {ICompositeNumberColumnDesc} from './CompositeNumberColumn';
import {IDataRow} from './interfaces';
import {EAdvancedSortMethod} from './INumberColumn';
import {IEventListener} from '../internal/AEventDispatcher';

/**
 *  factory for creating a description creating a max column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createReduceDesc(label: string = 'Reduce') {
  return {type: 'reduce', label};
}

export interface IReduceDesc {
  readonly reduce?: EAdvancedSortMethod;
}


export declare type IReduceColumnDesc = IReduceDesc & ICompositeNumberColumnDesc;

/**
 * emitted when the mapping property changes
 * @asMemberOf ReduceColumn
 * @event
 */
export declare function reduceChanged(previous: EAdvancedSortMethod, current: EAdvancedSortMethod): void;

/**
 * combines multiple columns by using the maximal value
 */
@toolbar('reduce')
export default class ReduceColumn extends CompositeNumberColumn {
  static readonly EVENT_REDUCE_CHANGED = 'reduceChanged';

  private reduce: EAdvancedSortMethod;

  constructor(id: string, desc: Readonly<IReduceColumnDesc>) {
    super(id, desc);
    this.reduce = desc.reduce || EAdvancedSortMethod.max;
    this.setDefaultRenderer('interleaving');
    this.setDefaultGroupRenderer('interleaving');
    this.setDefaultSummaryRenderer('interleaving');
  }

  get label() {
    const l = super.getMetaData().label;
    if (l !== 'Reduce') {
      return l;
    }
    return `${this.reduce[0].toUpperCase()}${this.reduce.slice(1)}(${this.children.map((d) => d.label).join(', ')})`;
  }

  getColor(row: IDataRow) {
    //compute the index of the maximal one
    const c = this._children;
    if (c.length === 0 || this.reduce === EAdvancedSortMethod.q1 || this.reduce === EAdvancedSortMethod.q3 || this.reduce === EAdvancedSortMethod.mean) {
      return this.color;
    }
    const v = this.compute(row);
    const selected = c.find((c) => c.getValue(row) === v);
    return selected ? selected.color : this.color;
  }

  protected compute(row: IDataRow) {
    const vs = this._children.map((d) => d.getValue(row)).filter((d) => !isNaN(d));
    if (vs.length === 0) {
      return NaN;
    }
    switch (this.reduce) {
      case EAdvancedSortMethod.mean:
        return vs.reduce((a, b) => a + b, 0) / vs.length;
      case EAdvancedSortMethod.max:
        return Math.max(...vs);
      case EAdvancedSortMethod.min:
        return Math.min(...vs);
      case EAdvancedSortMethod.median:
        return median(vs)!;
      case EAdvancedSortMethod.q1:
        return quantile(vs.sort((a, b) => a - b), 0.25)!;
      case EAdvancedSortMethod.q3:
        return quantile(vs.sort((a, b) => a - b), 0.75)!;
    }
  }

  protected createEventList() {
    return super.createEventList().concat([ReduceColumn.EVENT_REDUCE_CHANGED]);
  }

  on(type: typeof ReduceColumn.EVENT_REDUCE_CHANGED, listener: typeof reduceChanged | null): this;
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

  getReduce() {
    return this.reduce;
  }

  setReduce(reduce: EAdvancedSortMethod) {
    if (this.reduce === reduce) {
      return;
    }
    this.fire([ReduceColumn.EVENT_REDUCE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.reduce, this.reduce = reduce);
  }

  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.reduce = this.reduce;
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    this.reduce = dump.reduce || this.reduce;
    super.restore(dump, factory);
  }

  get canJustAddNumbers() {
    return true;
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
