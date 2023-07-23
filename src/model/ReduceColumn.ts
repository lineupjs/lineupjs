import { median, quantile, type IEventListener } from '../internal';
import { toolbar } from './annotations';
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
  DEFAULT_COLOR,
} from './Column';
import type CompositeColumn from './CompositeColumn';
import type { addColumn, filterChanged, moveColumn, removeColumn } from './CompositeColumn';
import CompositeNumberColumn, { type ICompositeNumberColumnDesc } from './CompositeNumberColumn';
import type { IColumnDump, IDataRow, ITypeFactory } from './interfaces';
import { EAdvancedSortMethod } from './INumberColumn';
import { integrateDefaults } from './internal';
import { restoreValue } from './diff';

/**
 *  factory for creating a description creating a max column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createReduceDesc(label = 'Reduce') {
  return { type: 'reduce', label };
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
    super(
      id,
      integrateDefaults(desc, {
        renderer: 'interleaving',
        groupRenderer: 'interleaving',
        summaryRenderer: 'interleaving',
      })
    );
    this.reduce = desc.reduce || EAdvancedSortMethod.max;
  }

  override get label() {
    const l = super.getMetaData().label;
    if (l !== 'Reduce') {
      return l;
    }
    return `${this.reduce[0].toUpperCase()}${this.reduce.slice(1)}(${this.children.map((d) => d.label).join(', ')})`;
  }

  override getColor(row: IDataRow) {
    //compute the index of the maximal one
    const c = this._children;
    if (
      c.length === 0 ||
      this.reduce === EAdvancedSortMethod.q1 ||
      this.reduce === EAdvancedSortMethod.q3 ||
      this.reduce === EAdvancedSortMethod.mean
    ) {
      return DEFAULT_COLOR;
    }
    const v = this.compute(row);
    const selected = c.find((c) => c.getValue(row) === v);
    return selected ? selected.getColor(row) : DEFAULT_COLOR;
  }

  protected override compute(row: IDataRow) {
    const vs = this._children.map((d) => d.getValue(row)).filter((d) => !Number.isNaN(d));
    if (vs.length === 0) {
      return NaN;
    }
    switch (this.reduce) {
      case EAdvancedSortMethod.mean:
        return vs.reduce((a, b) => a + b, 0) / vs.length;
      case EAdvancedSortMethod.max:
        return vs.reduce((a, b) => Math.max(a, b), Number.NEGATIVE_INFINITY);
      case EAdvancedSortMethod.min:
        return vs.reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
      case EAdvancedSortMethod.median:
        return median(vs)!;
      case EAdvancedSortMethod.q1:
        return quantile(
          vs.sort((a, b) => a - b),
          0.25
        )!;
      case EAdvancedSortMethod.q3:
        return quantile(
          vs.sort((a, b) => a - b),
          0.75
        )!;
    }
  }

  protected override createEventList() {
    return super.createEventList().concat([ReduceColumn.EVENT_REDUCE_CHANGED]);
  }

  override on(type: typeof ReduceColumn.EVENT_REDUCE_CHANGED, listener: typeof reduceChanged | null): this;
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

  getReduce() {
    return this.reduce;
  }

  setReduce(reduce: EAdvancedSortMethod) {
    if (this.reduce === reduce) {
      return;
    }
    this.fire(
      [ReduceColumn.EVENT_REDUCE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY],
      this.reduce,
      (this.reduce = reduce)
    );
  }

  override toJSON() {
    const r = super.toJSON();
    r.reduce = this.reduce;
    return r;
  }

  override restore(dump: IColumnDump, factory: ITypeFactory): Set<string> {
    const changed = super.restore(dump, factory);
    this.reduce = restoreValue(dump.reduce, this.reduce, changed, [
      ReduceColumn.EVENT_REDUCE_CHANGED,
      Column.EVENT_DIRTY_VALUES,
      Column.EVENT_DIRTY_CACHES,
      Column.EVENT_DIRTY,
    ]);
    return changed;
  }

  override get canJustAddNumbers() {
    return true;
  }

  override getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    if (format === 'json') {
      return {
        value: this.getRawNumber(row),
        children: this.children.map((d) => d.getExportValue(row, format)),
      };
    }
    return super.getExportValue(row, format);
  }
}
