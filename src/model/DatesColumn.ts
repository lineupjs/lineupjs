import { timeFormat, timeParse } from 'd3-time-format';
import { median, min, max, type IEventListener } from '../internal';
import { dialogAddons, toolbar } from './annotations';
import ArrayColumn, { type IArrayColumnDesc } from './ArrayColumn';
import type {
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
import Column from './Column';
import type { dataLoaded } from './ValueColumn';
import type ValueColumn from './ValueColumn';
import type { IDateDesc, IDatesColumn, IDateFilter } from './IDateColumn';
import { type IDataRow, ECompareValueType, type ITypeFactory, type IColumnDump } from './interfaces';
import { isMissingValue } from './missing';
import DateColumn from './DateColumn';
import { noDateFilter, isDummyDateFilter, restoreDateFilter } from './internalDate';
import { chooseUIntByDataLength, integrateDefaults } from './internal';
import { restoreValue } from './diff';

export enum EDateSort {
  min = 'min',
  max = 'max',
  median = 'median',
}

export interface IDatesDesc extends IDateDesc {
  sort?: EDateSort;
}

export declare type IDatesColumnDesc = IDatesDesc & IArrayColumnDesc<Date>;

/**
 * emitted when the sort method property changes
 * @asMemberOf DatesColumn
 * @event
 */
export declare function sortMethodChanged_DCS(previous: EDateSort, current: EDateSort): void;

/**
 * emitted when the filter property changes
 * @asMemberOf DatesColumn
 * @event
 */
export declare function filterChanged_DCS(previous: IDateFilter | null, current: IDateFilter | null): void;

@toolbar('rename', 'clone', 'sort', 'sortBy', 'filterDate')
@dialogAddons('sort', 'sortDates')
export default class DatesColumn extends ArrayColumn<Date | null> implements IDatesColumn {
  static readonly EVENT_SORTMETHOD_CHANGED = 'sortMethodChanged';
  static readonly EVENT_FILTER_CHANGED = DateColumn.EVENT_FILTER_CHANGED;

  private readonly format: (date: Date | null) => string;
  private readonly parse: (date: string) => Date | null;
  private sort: EDateSort;
  private currentFilter: IDateFilter = noDateFilter();

  constructor(id: string, desc: Readonly<IDatesColumnDesc>) {
    super(
      id,
      integrateDefaults(desc, {
        renderer: 'datehistogram',
        groupRenderer: 'datehistogram',
        summaryRenderer: 'datehistogram',
      })
    );
    const f = timeFormat(desc.dateFormat || DateColumn.DEFAULT_DATE_FORMAT);
    this.format = (v) => (v instanceof Date ? f(v) : '');
    this.parse = desc.dateParse
      ? timeParse(desc.dateParse)
      : timeParse(desc.dateFormat || DateColumn.DEFAULT_DATE_FORMAT);
    this.sort = desc.sort || EDateSort.median;
  }

  getFormatter() {
    return this.format;
  }

  protected override createEventList() {
    return super.createEventList().concat([DatesColumn.EVENT_SORTMETHOD_CHANGED, DatesColumn.EVENT_FILTER_CHANGED]);
  }

  override on(type: typeof DatesColumn.EVENT_SORTMETHOD_CHANGED, listener: typeof sortMethodChanged_DCS | null): this;
  override on(type: typeof DatesColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged_DCS | null): this;
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

  override getValue(row: IDataRow): (Date | null)[] | null {
    const r = this.getDates(row);
    return r.every((d) => d == null) ? null : r;
  }

  override getLabels(row: IDataRow) {
    return this.getDates(row).map((v) => (v instanceof Date ? this.format(v) : ''));
  }

  getDates(row: IDataRow): (Date | null)[] {
    return super.getValues(row).map((v) => {
      if (isMissingValue(v)) {
        return null;
      }
      if (v instanceof Date) {
        return v;
      }
      return this.parse(String(v));
    });
  }

  getDate(row: IDataRow) {
    const av = this.getDates(row).filter(Boolean);
    if (av.length === 0) {
      return null;
    }
    return new Date(compute(av, this.sort));
  }

  iterDate(row: IDataRow) {
    return this.getDates(row);
  }

  getSortMethod() {
    return this.sort;
  }

  setSortMethod(sort: EDateSort) {
    if (this.sort === sort) {
      return;
    }
    this.fire([DatesColumn.EVENT_SORTMETHOD_CHANGED], this.sort, (this.sort = sort));
    // sort by me if not already sorted by me
    if (!this.isSortedByMe().asc) {
      this.sortByMe();
    }
  }

  override toJSON() {
    const r = super.toJSON();
    r.sortMethod = this.sort;
    r.filter = this.getFilter();
    return r;
  }

  override restore(dump: IColumnDump, factory: ITypeFactory): Set<string> {
    const changed = super.restore(dump, factory);
    this.sort = restoreValue(dump.sortMethod, this.sort, changed, DatesColumn.EVENT_SORTMETHOD_CHANGED);
    this.currentFilter = restoreValue(
      dump.filter ? restoreDateFilter(dump.filter) : undefined,
      this.currentFilter,
      changed,
      [DateColumn.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY]
    );
    return changed;
  }

  override toCompareValue(row: IDataRow) {
    const vs = this.getDates(row).filter(Boolean);
    if (!vs) {
      return [0, 0];
    }
    return [vs.length, compute(vs, this.sort)];
  }

  override toCompareValueType() {
    return [chooseUIntByDataLength(this.dataLength), ECompareValueType.DOUBLE_ASC];
  }

  override isFiltered() {
    return DateColumn.prototype.isFiltered.call(this);
  }

  getFilter(): IDateFilter {
    return DateColumn.prototype.getFilter.call(this);
  }

  setFilter(value: IDateFilter | null) {
    DateColumn.prototype.setFilter.call(this, value);
  }

  override filter(row: IDataRow) {
    return DateColumn.prototype.filter.call(this, row);
  }

  override clearFilter() {
    return DateColumn.prototype.clearFilter.call(this);
  }
}

function compute(arr: Date[], sort: EDateSort) {
  switch (sort) {
    case EDateSort.min:
      return min(arr, (d) => d.getTime())!;
    case EDateSort.max:
      return max(arr, (d) => d.getTime())!;
    case EDateSort.median:
      return median(arr, (d) => d.getTime())!;
  }
}
