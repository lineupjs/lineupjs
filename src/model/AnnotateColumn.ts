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
import type { IColumnDump, IDataRow, ITypeFactory } from './interfaces';
import StringColumn from './StringColumn';
import type { IEventListener } from '../internal';
import type { dataLoaded } from './ValueColumn';
import type ValueColumn from './ValueColumn';
import { restoreValue } from './diff';

/**
 * emitted when the filter property changes
 * @asMemberOf AnnotateColumn
 * @event
 */
export declare function filterChanged_AC(previous: string | RegExp | null, current: string | RegExp | null): void;

/**
 * emitted when the grouping property changes
 * @asMemberOf AnnotateColumn
 * @event
 */
export declare function groupingChanged_AC(previous: (RegExp | string)[][], current: (RegExp | string)[][]): void;

/**
 * emitted when the value of a row changes
 * @asMemberOf AnnotateColumn
 * @event
 */
export declare function valueChanged(dataIndex: number, previous: string, current: string): void;

/**
 * a string column in which the values can be edited locally
 */
export default class AnnotateColumn extends StringColumn {
  static readonly EVENT_VALUE_CHANGED = 'valueChanged';

  private readonly annotations = new Map<number, string>();

  protected override createEventList() {
    return super.createEventList().concat([AnnotateColumn.EVENT_VALUE_CHANGED]);
  }

  override on(type: typeof AnnotateColumn.EVENT_VALUE_CHANGED, listener: typeof valueChanged | null): this;
  override on(type: typeof StringColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged_AC | null): this;
  override on(type: typeof StringColumn.EVENT_GROUPING_CHANGED, listener: typeof groupingChanged_AC | null): this;
  override on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
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
    return super.on(type as any, listener);
  }

  override getValue(row: IDataRow) {
    if (this.annotations.has(row.i)) {
      return this.annotations.get(row.i)!;
    }
    return super.getValue(row);
  }

  private getAnnotations(): Record<string, string> {
    const annotations = {} as Record<string, string>;
    this.annotations.forEach((v, k) => {
      annotations[k.toString()] = v;
    });
    return annotations;
  }

  private setAnnotations(value: Record<string, string>) {
    this.annotations.clear();
    for (const [k, v] of Object.entries(value)) {
      this.annotations.set(Number.parseInt(k, 10), v);
    }
  }

  override toJSON() {
    const r = super.toJSON();
    r.annotations = this.getAnnotations();
    return r;
  }

  override restore(dump: IColumnDump, factory: ITypeFactory): Set<string> {
    const changed = super.restore(dump, factory);
    const current = this.getAnnotations();
    const target = restoreValue(dump.annotations, current, changed, [
      AnnotateColumn.EVENT_VALUE_CHANGED,
      Column.EVENT_DIRTY_VALUES,
      Column.EVENT_DIRTY_CACHES,
      Column.EVENT_DIRTY,
    ]);
    if (target !== current) {
      this.setAnnotations(target);
    }
    return changed;
  }

  setValue(row: IDataRow, value: string) {
    const old = this.getValue(row);
    if (old === value) {
      return true;
    }
    if (value === '' || value == null) {
      this.annotations.delete(row.i);
    } else {
      this.annotations.set(row.i, value);
    }
    this.fire(
      [AnnotateColumn.EVENT_VALUE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY],
      row.i,
      old,
      value
    );
    return true;
  }
}
