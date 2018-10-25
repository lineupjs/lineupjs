import {format} from 'd3-format';
import {equalArrays} from '../internal';
import {Category, toolbar, SortByDefault, dialogAddons} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import {IDataRow, IGroup, IGroupData} from './interfaces';
import {groupCompare, isDummyNumberFilter, restoreFilter} from './internal';
import {
  default as INumberColumn, EAdvancedSortMethod, INumberDesc, INumberFilter, isEqualNumberFilter,
  isNumberIncluded, noNumberFilter, numberCompare
} from './INumberColumn';
import {
  createMappingFunction, IMapAbleColumn, IMappingFunction, restoreMapping,
  ScaleMappingFunction
} from './MappingFunction';
import {isMissingValue, isUnknown, missingGroup} from './missing';
import ValueColumn, {IValueColumnDesc, dataLoaded} from './ValueColumn';
import {IEventListener} from '../internal/AEventDispatcher';
import {IColorMappingFunction, createColorMappingFunction, restoreColorMapping} from './ColorMappingFunction';

export {default as INumberColumn, isNumberColumn} from './INumberColumn';


export declare type INumberColumnDesc = INumberDesc & IValueColumnDesc<number>;


/**
 * emitted when the mapping property changes
 * @asMemberOf NumberColumn
 * @event
 */
export declare function mappingChanged(previous: IMappingFunction, current: IMappingFunction): void;

/**
 * emitted when the color mapping property changes
 * @asMemberOf NumberColumn
 * @event
 */
export declare function colorMappingChanged(previous: IColorMappingFunction, current: IColorMappingFunction): void;

/**
 * emitted when the filter property changes
 * @asMemberOf NumberColumn
 * @event
 */
export declare function filterChanged(previous: INumberFilter | null, current: INumberFilter | null): void;

/**
 * emitted when the sort method property changes
 * @asMemberOf NumberColumn
 * @event
 */
export declare function sortMethodChanged(previous: EAdvancedSortMethod, current: EAdvancedSortMethod): void;

/**
 * emitted when the grouping property changes
 * @asMemberOf NumberColumn
 * @event
 */
export declare function groupingChanged(previous: number[], current: number[]): void;

/**
 * a number column mapped from an original input scale to an output range
 */
@toolbar('groupBy', 'sortGroupBy', 'filterNumber', 'colorMapped', 'editMapping')
@dialogAddons('sortGroup', 'sortNumber')
@dialogAddons('group', 'groupNumber')
@Category('number')
@SortByDefault('descending')
export default class NumberColumn extends ValueColumn<number> implements INumberColumn, IMapAbleColumn {
  static readonly EVENT_MAPPING_CHANGED = 'mappingChanged';
  static readonly EVENT_COLOR_MAPPING_CHANGED = 'colorMappingChanged';
  static readonly EVENT_FILTER_CHANGED = 'filterChanged';
  static readonly EVENT_SORTMETHOD_CHANGED = 'sortMethodChanged';
  static readonly EVENT_GROUPING_CHANGED = 'groupingChanged';

  private readonly missingValue: number;

  private mapping: IMappingFunction;
  private colorMapping: IColorMappingFunction;
  private original: IMappingFunction;

  /**
   * currently active filter
   * @type {{min: number, max: number}}
   * @private
   */
  private currentFilter: INumberFilter = noNumberFilter();

  private numberFormat: (n: number) => string = format('.2f');

  private currentGroupThresholds: number[] = [];
  private groupSortMethod: EAdvancedSortMethod = EAdvancedSortMethod.median;

  constructor(id: string, desc: INumberColumnDesc) {
    super(id, desc);

    this.mapping = restoreMapping(desc);
    this.original = this.mapping.clone();
    this.colorMapping = restoreColorMapping(this.color, desc);

    if (desc.numberFormat) {
      this.numberFormat = format(desc.numberFormat);
    }
    this.missingValue = desc.missingValue != null ? desc.missingValue : NaN;

    this.setGroupRenderer('boxplot');
    this.setDefaultSummaryRenderer('histogram');
  }

  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.map = this.mapping.dump();
    r.colorMapping = this.colorMapping.dump();
    r.filter = isDummyNumberFilter(this.currentFilter) ? null : this.currentFilter;
    r.groupSortMethod = this.groupSortMethod;
    if (this.currentGroupThresholds) {
      r.stratifyThreshholds = this.currentGroupThresholds;
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (dump.map) {
      this.mapping = createMappingFunction(dump.map);
    } else if (dump.domain) {
      this.mapping = new ScaleMappingFunction(dump.domain, 'linear', dump.range || [0, 1]);
    }
    if (dump.colorMapping) {
      this.colorMapping = createColorMappingFunction(this.color, dump.colorMapping);
    }
    if (dump.groupSortMethod) {
      this.groupSortMethod = dump.groupSortMethod;
    }
    if (dump.filter) {
      this.currentFilter = restoreFilter(dump.filter);
    }
    if (dump.stratifyThreshholds) {
      this.currentGroupThresholds = dump.stratifyThresholds;
    }
    if (dump.numberFormat) {
      this.numberFormat = format(dump.numberFormat);
    }
  }

  protected createEventList() {
    return super.createEventList().concat([NumberColumn.EVENT_MAPPING_CHANGED, NumberColumn.EVENT_COLOR_MAPPING_CHANGED, NumberColumn.EVENT_FILTER_CHANGED, NumberColumn.EVENT_SORTMETHOD_CHANGED, NumberColumn.EVENT_GROUPING_CHANGED]);
  }

  on(type: typeof NumberColumn.EVENT_MAPPING_CHANGED, listener: typeof mappingChanged | null): this;
  on(type: typeof NumberColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged | null): this;
  on(type: typeof NumberColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
  on(type: typeof NumberColumn.EVENT_SORTMETHOD_CHANGED, listener: typeof sortMethodChanged | null): this;
  on(type: typeof NumberColumn.EVENT_GROUPING_CHANGED, listener: typeof groupingChanged | null): this;
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

  getLabel(row: IDataRow) {
    if ((<any>this.desc).numberFormat) {
      const raw = this.getRawValue(row);
      //if a dedicated format and a number use the formatter in any case
      if (isNaN(raw)) {
        return 'NaN';
      }
      if (!isFinite(raw)) {
        return raw.toString();
      }
      return this.numberFormat(raw);
    }
    const v = super.getValue(row);
    //keep non number if it is not a number else convert using formatter
    if (typeof v === 'number') {
      return this.numberFormat(+v);
    }
    return String(v);
  }

  getRange() {
    return this.mapping.getRange(this.numberFormat);
  }

  getRawValue(row: IDataRow, missingValue = this.missingValue) {
    const v: any = super.getValue(row);
    if (isMissingValue(v)) {
      return missingValue;
    }
    return +v;
  }

  getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    return format === 'json' ? this.getRawValue(row) : super.getExportValue(row, format);
  }

  isMissing(row: IDataRow) {
    return isMissingValue(super.getValue(row));
  }

  getValue(row: IDataRow) {
    const v = this.getRawValue(row);
    if (isNaN(v)) {
      return v;
    }
    return this.mapping.apply(v);
  }

  getNumber(row: IDataRow) {
    return this.getValue(row);
  }

  getRawNumber(row: IDataRow, missingValue = this.missingValue) {
    return this.getRawValue(row, missingValue);
  }

  compare(a: IDataRow, b: IDataRow) {
    return numberCompare(this.getNumber(a), this.getNumber(b), this.isMissing(a), this.isMissing(b));
  }

  groupCompare(a: IGroupData, b: IGroupData): number {
    return groupCompare(a.rows, b.rows, this, <any>this.groupSortMethod);
  }

  getOriginalMapping() {
    return this.original.clone();
  }

  getMapping() {
    return this.mapping.clone();
  }

  setMapping(mapping: IMappingFunction) {
    if (this.mapping.eq(mapping)) {
      return;
    }
    this.fire([NumberColumn.EVENT_MAPPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY], this.mapping.clone(), this.mapping = mapping);
  }

  getColor(row: IDataRow) {
    const v = this.getNumber(row);
    if (isNaN(v)) {
      return this.color;
    }
    return this.colorMapping.apply(v);
  }

  getColorMapping() {
    return this.colorMapping.clone();
  }

  setColorMapping(mapping: IColorMappingFunction) {
    if (this.colorMapping.eq(mapping)) {
      return;
    }
    this.fire([NumberColumn.EVENT_COLOR_MAPPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY], this.colorMapping.clone(), this.colorMapping = mapping);
  }

  isFiltered() {
    return !isDummyNumberFilter(this.currentFilter);
  }

  getFilter(): INumberFilter {
    return Object.assign({}, this.currentFilter);
  }

  setFilter(value: INumberFilter = {min: -Infinity, max: +Infinity, filterMissing: false}) {
    if (isEqualNumberFilter(value, this.currentFilter)) {
      return;
    }
    const bak = this.getFilter();
    this.currentFilter.min = isUnknown(value.min) ? -Infinity : value.min;
    this.currentFilter.max = isUnknown(value.max) ? Infinity : value.max;
    this.currentFilter.filterMissing = value.filterMissing;
    this.fire([NumberColumn.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getFilter());
  }

  /**
   * filter the current row if any filter is set
   * @param row
   * @returns {boolean}
   */
  filter(row: IDataRow) {
    return isNumberIncluded(this.currentFilter, this.getRawNumber(row, NaN));
  }

  getGroupThresholds() {
    return this.currentGroupThresholds.slice();
  }

  setGroupThresholds(value: number[]) {
    if (equalArrays(this.currentGroupThresholds, value)) {
      return;
    }
    const bak = this.getGroupThresholds();
    this.currentGroupThresholds = value.slice();
    this.fire([NumberColumn.EVENT_GROUPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, value);
  }


  group(row: IDataRow): IGroup {
    if (this.isMissing(row)) {
      return missingGroup;
    }

    let threshold = this.currentGroupThresholds;
    if (threshold.length === 0) {
      // default threshold
      const d = this.mapping.domain;
      threshold = [(d[1] - d[0]) / 2];
    }

    const value = this.getRawNumber(row);
    const treshholdIndex = threshold.findIndex((t) => value <= t);
    // group by thresholds / bins
    switch (treshholdIndex) {
      case -1:
        //bigger than the last threshold
        return {
          name: `${this.label} > ${threshold[threshold.length - 1]}`,
          color: this.colorMapping.apply(1)
        };
      case 0:
        //smallest
        return {
          name: `${this.label} <= ${threshold[0]}`,
          color: this.colorMapping.apply(0)
        };
      default:
        return {
          name: `${threshold[treshholdIndex - 1]} <= ${this.label} <= ${threshold[treshholdIndex]}`,
          color: this.colorMapping.apply(this.mapping.apply((threshold[treshholdIndex - 1] + threshold[treshholdIndex]) / 2))
        };
    }
  }

  getSortMethod() {
    return this.groupSortMethod;
  }

  setSortMethod(sortMethod: EAdvancedSortMethod) {
    if (this.groupSortMethod === sortMethod) {
      return;
    }
    this.fire([NumberColumn.EVENT_SORTMETHOD_CHANGED], this.groupSortMethod, this.groupSortMethod = sortMethod);
    // sort by me if not already sorted by me
    if (!this.isGroupSortedByMe().asc) {
      this.toggleMyGroupSorting();
    }
  }
}
