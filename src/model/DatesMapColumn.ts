import { timeFormat, timeParse } from 'd3-time-format';
import type { IDateColumn, IDateFilter } from './IDateColumn';
import type { IKeyValue } from './IArrayColumn';
import type { IColumnDump, IDataRow, ITypeFactory } from './interfaces';
import MapColumn, { type IMapColumnDesc } from './MapColumn';
import { isMissingValue } from './missing';
import DatesColumn, { EDateSort, type IDatesDesc } from './DatesColumn';
import DateColumn from './DateColumn';
import { dialogAddons, toolbar } from './annotations';
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
import type { IEventListener } from '../internal';
import { noDateFilter, isDummyDateFilter, restoreDateFilter } from './internalDate';
import { integrateDefaults } from './internal';
import { restoreValue } from './diff';

export declare type IDateMapColumnDesc = IDatesDesc & IMapColumnDesc<Date | null>;

/**
 * emitted when the sort method property changes
 * @asMemberOf DatesMapColumn
 * @event
 */
export declare function sortMethodChanged_DMC(previous: EDateSort, current: EDateSort): void;

/**
 * emitted when the filter property changes
 * @asMemberOf DatesMapColumn
 * @event
 */
export declare function filterChanged_DMC(previous: IDateFilter | null, current: IDateFilter | null): void;

@toolbar('rename', 'filterDate')
@dialogAddons('sort', 'sortDates')
export default class DatesMapColumn extends MapColumn<Date | null> implements IDateColumn {
  static readonly EVENT_SORTMETHOD_CHANGED = DatesColumn.EVENT_SORTMETHOD_CHANGED;
  static readonly EVENT_FILTER_CHANGED = DateColumn.EVENT_FILTER_CHANGED;

  private readonly format: (date: Date | null) => string;
  private readonly parse: (date: string) => Date | null;
  private sort: EDateSort;
  private currentFilter: IDateFilter = noDateFilter();

  constructor(id: string, desc: Readonly<IDateMapColumnDesc>) {
    super(
      id,
      integrateDefaults(desc, {
        renderer: 'default',
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
    return super
      .createEventList()
      .concat([DatesMapColumn.EVENT_SORTMETHOD_CHANGED, DatesMapColumn.EVENT_FILTER_CHANGED]);
  }

  override on(
    type: typeof DatesMapColumn.EVENT_SORTMETHOD_CHANGED,
    listener: typeof sortMethodChanged_DMC | null
  ): this;
  override on(type: typeof DatesMapColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged_DMC | null): this;
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

  private parseValue(v: any) {
    if (isMissingValue(v)) {
      return null;
    }
    if (v instanceof Date) {
      return v;
    }
    return this.parse(String(v));
  }

  getDateMap(row: IDataRow) {
    return super.getMap(row).map(({ key, value }) => ({
      key,
      value: this.parseValue(value),
    }));
  }

  iterDate(row: IDataRow) {
    return this.getDates(row);
  }

  override getValue(row: IDataRow) {
    const r = this.getDateMap(row);

    return r.every((d) => d == null) ? null : r;
  }

  override getLabels(row: IDataRow): IKeyValue<string>[] {
    return this.getDateMap(row).map(({ key, value }) => ({
      key,
      value: value instanceof Date ? this.format(value) : '',
    }));
  }

  getDates(row: IDataRow): (Date | null)[] {
    return this.getDateMap(row).map((v) => v.value);
  }

  getDate(row: IDataRow) {
    return DatesColumn.prototype.getDate.call(this, row);
  }

  getSortMethod() {
    return this.sort;
  }

  setSortMethod(sort: EDateSort) {
    return DatesColumn.prototype.setSortMethod.call(this, sort);
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
