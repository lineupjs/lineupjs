import {timeFormat, timeParse} from 'd3-time-format';
import {Category, toolbar, dialogAddons} from './annotations';
import {IDataRow} from './interfaces';
import {FIRST_IS_MISSING, isMissingValue} from './missing';
import ValueColumn, {IValueColumnDesc, dataLoaded} from './ValueColumn';
import {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import {IEventListener} from '../internal/AEventDispatcher';
import Column from './Column';
import {IDateFilter, IDateDesc, noDateFilter, isDummyDateFilter, IDateGrouper, restoreDateFilter, IDateColumn} from './IDateColumn';


export declare type IDateColumnDesc = IValueColumnDesc<Date> & IDateDesc;

/**
 * emitted when the filter property changes
 * @asMemberOf NumberColumn
 * @event
 */
export declare function filterChanged(previous: IDateFilter | null, current: IDateFilter | null): void;

/**
 * emitted when the grouping property changes
 * @asMemberOf NumberColumn
 * @event
 */
export declare function groupingChanged(previous: IDateGrouper | null, current: IDateGrouper | null): void;


@toolbar('groupBy', 'sortGroupBy', 'filterDate')
@dialogAddons('group', 'groupDate')
@Category('date')
export default class DateColumn extends ValueColumn<Date> implements IDateColumn {
  static readonly EVENT_FILTER_CHANGED = 'filterChanged';
  static readonly EVENT_GROUPING_CHANGED = 'groupingChanged';

  private readonly format: (date: Date) => string;
  private readonly parse: (date: string) => Date | null;

  /**
   * currently active filter
   * @type {{min: number, max: number}}
   * @private
   */
  private currentFilter: IDateFilter = noDateFilter();
  private currentGrouper: IDateGrouper | null = null;

  constructor(id: string, desc: Readonly<IDateColumnDesc>) {
    super(id, desc);
    this.format = timeFormat(desc.dateFormat || '%x');
    this.parse = desc.dateParse ? timeParse(desc.dateParse) : timeParse(desc.dateFormat || '%x');
    this.setDefaultRenderer('default');
  }

  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.filter = isDummyDateFilter(this.currentFilter) ? null : this.currentFilter;
    if (this.currentGrouper) {
      r.grouper = this.currentGrouper;
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (dump.filter) {
      this.currentFilter = restoreDateFilter(dump.filter);
    }
    if (dump.grouper) {
      this.currentGrouper = dump.grouper;
    }
  }

  protected createEventList() {
    return super.createEventList().concat([DateColumn.EVENT_FILTER_CHANGED, DateColumn.EVENT_GROUPING_CHANGED]);
  }

  on(type: typeof DateColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
  on(type: typeof DateColumn.EVENT_GROUPING_CHANGED, listener: typeof groupingChanged | null): this;
  on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
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
    return super.on(<any>type, listener);
  }

  getValue(row: IDataRow): Date | null {
    return this.getDate(row);
  }

  getDate(row: IDataRow) {
    const v = super.getValue(row);
    if (isMissingValue(v)) {
      return null;
    }
    if (v instanceof Date) {
      return v;
    }
    return this.parse(String(v));
  }

  getLabel(row: IDataRow) {
    const v = this.getValue(row);
    if (!(v instanceof Date)) {
      return '';
    }
    return this.format(v);
  }

  compare(a: IDataRow, b: IDataRow) {
    const av = this.getDate(a);
    const bv = this.getDate(b);
    if (av === bv) {
      return 0;
    }
    if (!(av instanceof Date)) {
      return (bv instanceof Date) ? FIRST_IS_MISSING : 0;
    }
    if (!(bv instanceof Date)) {
      return FIRST_IS_MISSING * -1;
    }
    return av.getTime() - bv.getTime();
  }
}
