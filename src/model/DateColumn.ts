import {timeFormat, timeParse} from 'd3-time-format';
import {Category, toolbar, dialogAddons} from './annotations';
import {IDataRow, IGroupData} from './interfaces';
import {FIRST_IS_MISSING, isMissingValue, missingGroup, isUnknown} from './missing';
import ValueColumn, {IValueColumnDesc, dataLoaded} from './ValueColumn';
import {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import {IEventListener} from '../internal/AEventDispatcher';
import Column from './Column';
import {IDateFilter, IDateDesc, noDateFilter, isDateIncluded, isDummyDateFilter, isEqualDateFilter, IDateGrouper, restoreDateFilter, IDateColumn, toDateGroup, isDefaultDateGrouper, defaultDateGrouper} from './IDateColumn';
import {median} from 'd3-array';
import {defaultGroup} from './Group';
import {equal} from '../internal/utils';
import {numberCompare} from './INumberColumn';


export declare type IDateColumnDesc = IValueColumnDesc<Date> & IDateDesc;

/**
 * emitted when the filter property changes
 * @asMemberOf DateColumn
 * @event
 */
export declare function filterChanged(previous: IDateFilter | null, current: IDateFilter | null): void;

/**
 * emitted when the grouping property changes
 * @asMemberOf DateColumn
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
  private currentGrouper: IDateGrouper = defaultDateGrouper();

  constructor(id: string, desc: Readonly<IDateColumnDesc>) {
    super(id, desc);
    this.format = timeFormat(desc.dateFormat || '%x');
    this.parse = desc.dateParse ? timeParse(desc.dateParse) : timeParse(desc.dateFormat || '%x');
  }

  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.filter = isDummyDateFilter(this.currentFilter) ? null : this.currentFilter;
    if (this.currentGrouper && !isDefaultDateGrouper(this.currentGrouper)) {
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

  isFiltered() {
    return !isDummyDateFilter(this.currentFilter);
  }

  getFilter(): IDateFilter {
    return Object.assign({}, this.currentFilter);
  }

  setFilter(value: IDateFilter = {min: -Infinity, max: +Infinity, filterMissing: false}) {
    if (isEqualDateFilter(value, this.currentFilter)) {
      return;
    }
    const bak = this.getFilter();
    this.currentFilter.min = isUnknown(value.min) ? -Infinity : value.min;
    this.currentFilter.max = isUnknown(value.max) ? Infinity : value.max;
    this.currentFilter.filterMissing = value.filterMissing;
    this.fire([DateColumn.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getFilter());
  }

  /**
   * filter the current row if any filter is set
   * @param row
   * @returns {boolean}
   */
  filter(row: IDataRow) {
    return isDateIncluded(this.currentFilter, this.getDate(row));
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

  getDateGrouper() {
    return Object.assign({}, this.currentGrouper);
  }

  setDateGrouper(value: IDateGrouper) {
    if (equal(this.currentGrouper, value)) {
      return;
    }
    const bak = this.getDateGrouper();
    this.currentGrouper = Object.assign({}, value);
    this.fire([DateColumn.EVENT_GROUPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, value);
  }

  group(row: IDataRow) {
    const v = this.getDate(row);
    if (!v || !(v instanceof Date)) {
      return missingGroup;
    }
    if (!this.currentGrouper) {
      return defaultGroup;
    }
    const g = toDateGroup(this.currentGrouper, v);
    return {
      name: g.name,
      color: Column.DEFAULT_COLOR
    };
  }

  groupCompare(a: IGroupData, b: IGroupData): number {
    const av = choose(a.rows, this.currentGrouper, this).value;
    const bv = choose(b.rows, this.currentGrouper, this).value;
    return numberCompare(av, bv, false, false);
  }
}

/**
 * @internal
 */
export function choose(rows: IDataRow[], grouper: IDateGrouper | null, col: IDateColumn): { value: number | null, name: string } {
  const vs = <Date[]>rows.map((d) => col.getDate(d)).filter((d) => d instanceof Date);
  if (vs.length === 0) {
    return {value: null, name: ''};
  }
  const median = trueMedian(vs, (d) => d.getTime())!;
  if (!grouper) {
    return {value: median, name: (new Date(median)).toString()};
  }
  return toDateGroup(grouper, new Date(median));
}

function trueMedian(dates: Date[], acc: (d: Date) => number) {
  if (dates.length % 2 === 1) {
    return median(dates, acc);
  }
  // to avoid interpolating between the centers do it manually
  const s = dates.slice().sort((a, b) => a.getTime() - b.getTime());
  return s[Math.floor(s.length / 2)].getTime();
}
