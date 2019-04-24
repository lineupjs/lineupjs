import {format} from 'd3-format';
import {equalArrays, IEventListener, ISequence} from '../internal';
import {Category, dialogAddons, SortByDefault, toolbar} from './annotations';
import Column, {dirty, dirtyCaches, dirtyHeader, dirtyValues, groupRendererChanged, labelChanged, metaDataChanged, rendererTypeChanged, summaryRendererChanged, visibilityChanged, widthChanged} from './Column';
import {IDataRow, IGroup, ECompareValueType, IValueColumnDesc, DEFAULT_COLOR, ITypeFactory} from './interfaces';
import {INumberColumn, EAdvancedSortMethod, INumberDesc, INumberFilter, IMappingFunction, IColorMappingFunction, IMapAbleColumn} from './INumberColumn';
import {restoreMapping, ScaleMappingFunction} from './MappingFunction';
import {isMissingValue, isUnknown, missingGroup} from './missing';
import ValueColumn, {dataLoaded} from './ValueColumn';
import {noNumberFilter, isDummyNumberFilter, restoreNumberFilter, toCompareGroupValue, isEqualNumberFilter, isNumberIncluded} from './internalNumber';

export declare type INumberColumnDesc = INumberDesc & IValueColumnDesc<number>;


/**
 * emitted when the mapping property changes
 * @asMemberOf NumberColumn
 * @event
 */
export declare function mappingChanged_NC(previous: IMappingFunction, current: IMappingFunction): void;

/**
 * emitted when the color mapping property changes
 * @asMemberOf NumberColumn
 * @event
 */
export declare function colorMappingChanged_NC(previous: IColorMappingFunction, current: IColorMappingFunction): void;

/**
 * emitted when the filter property changes
 * @asMemberOf NumberColumn
 * @event
 */
export declare function filterChanged_NC(previous: INumberFilter | null, current: INumberFilter | null): void;

/**
 * emitted when the sort method property changes
 * @asMemberOf NumberColumn
 * @event
 */
export declare function sortMethodChanged_NC(previous: EAdvancedSortMethod, current: EAdvancedSortMethod): void;

/**
 * emitted when the grouping property changes
 * @asMemberOf NumberColumn
 * @event
 */
export declare function groupingChanged_NC(previous: number[], current: number[]): void;

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

  private mapping: IMappingFunction;
  private colorMapping: IColorMappingFunction;
  private original: IMappingFunction;

  /**
   * currently active filter
   * @type {{min: number, max: number}}
   * @private
   */
  private currentFilter: INumberFilter = noNumberFilter();

  private readonly numberFormat: (n: number) => string = format('.2f');

  private currentGroupThresholds: number[] = [];
  private groupSortMethod: EAdvancedSortMethod = EAdvancedSortMethod.median;

  constructor(id: string, desc: INumberColumnDesc, factory: ITypeFactory) {
    super(id, desc);

    this.mapping = restoreMapping(desc, factory);
    this.original = this.mapping.clone();
    this.colorMapping = factory.colorMappingFunction(desc.colorMapping || desc.color);

    if (desc.numberFormat) {
      this.numberFormat = format(desc.numberFormat);
    }

    this.setDefaultGroupRenderer('boxplot');
    this.setDefaultSummaryRenderer('histogram');
  }

  getNumberFormat() {
    return this.numberFormat;
  }

  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.map = this.mapping.toJSON();
    r.colorMapping = this.colorMapping.toJSON();
    r.filter = isDummyNumberFilter(this.currentFilter) ? null : this.currentFilter;
    r.groupSortMethod = this.groupSortMethod;
    if (this.currentGroupThresholds) {
      r.stratifyThreshholds = this.currentGroupThresholds;
    }
    return r;
  }

  restore(dump: any, factory: ITypeFactory) {
    super.restore(dump, factory);
    if (dump.map) {
      this.mapping = factory.mappingFunction(dump.map);
    } else if (dump.domain) {
      this.mapping = new ScaleMappingFunction(dump.domain, 'linear', dump.range || [0, 1]);
    }
    if (dump.colorMapping) {
      this.colorMapping = factory.colorMappingFunction(dump.colorMapping);
    }
    if (dump.groupSortMethod) {
      this.groupSortMethod = dump.groupSortMethod;
    }
    if (dump.filter) {
      this.currentFilter = restoreNumberFilter(dump.filter);
    }
    if (dump.stratifyThreshholds) {
      this.currentGroupThresholds = dump.stratifyThresholds;
    }
  }

  protected createEventList() {
    return super.createEventList().concat([NumberColumn.EVENT_MAPPING_CHANGED, NumberColumn.EVENT_COLOR_MAPPING_CHANGED, NumberColumn.EVENT_FILTER_CHANGED, NumberColumn.EVENT_SORTMETHOD_CHANGED, NumberColumn.EVENT_GROUPING_CHANGED]);
  }

  on(type: typeof NumberColumn.EVENT_MAPPING_CHANGED, listener: typeof mappingChanged_NC | null): this;
  on(type: typeof NumberColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged_NC | null): this;
  on(type: typeof NumberColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged_NC | null): this;
  on(type: typeof NumberColumn.EVENT_SORTMETHOD_CHANGED, listener: typeof sortMethodChanged_NC | null): this;
  on(type: typeof NumberColumn.EVENT_GROUPING_CHANGED, listener: typeof groupingChanged_NC | null): this;
  on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
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

  getRawValue(row: IDataRow) {
    const v: any = super.getValue(row);
    if (isMissingValue(v)) {
      return NaN;
    }
    return +v;
  }

  getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    return format === 'json' ? this.getRawValue(row) : super.getExportValue(row, format);
  }

  getValue(row: IDataRow) {
    const v = this.getNumber(row);
    if (isNaN(v)) {
      return null;
    }
    return v;
  }

  getNumber(row: IDataRow) {
    const v = this.getRawValue(row);
    if (isNaN(v)) {
      return NaN;
    }
    return this.mapping.apply(v);
  }

  iterNumber(row: IDataRow) {
    return [this.getNumber(row)];
  }

  iterRawNumber(row: IDataRow) {
    return [this.getRawNumber(row)];
  }

  getRawNumber(row: IDataRow) {
    return this.getRawValue(row);
  }

  toCompareValue(row: IDataRow, valueCache?: any) {
    return valueCache != null ? valueCache : this.getNumber(row);
  }

  toCompareValueType() {
    return ECompareValueType.FLOAT;
  }

  toCompareGroupValue(rows: ISequence<IDataRow>, _group: IGroup, valueCache?: ISequence<any>): number {
    return toCompareGroupValue(rows, this, <any>this.groupSortMethod, valueCache);
  }

  toCompareGroupValueType() {
    return ECompareValueType.FLOAT;
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
    this.fire([NumberColumn.EVENT_MAPPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY], this.mapping.clone(), this.mapping = mapping);
  }

  getColor(row: IDataRow) {
    const v = this.getNumber(row);
    if (isNaN(v)) {
      return DEFAULT_COLOR;
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

  setFilter(value: INumberFilter | null) {
    value = value || {min: -Infinity, max: +Infinity, filterMissing: false};
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
    return isNumberIncluded(this.currentFilter, this.getRawNumber(row));
  }

  clearFilter() {
    const was = this.isFiltered();
    this.setFilter(null);
    return was;
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
    const value = this.getRawNumber(row);
    if (isNaN(value)) {
      return Object.assign({}, missingGroup);
    }

    let threshold = this.currentGroupThresholds;
    if (threshold.length === 0) {
      // default threshold
      const d = this.mapping.domain;
      threshold = [(d[1] - d[0]) / 2];
    }

    const treshholdIndex = threshold.findIndex((t) => value <= t);
    // group by thresholds / bins
    switch (treshholdIndex) {
      case -1:
        //bigger than the last threshold
        return {
          name: `${this.label} > ${this.numberFormat(threshold[threshold.length - 1])}`,
          color: this.colorMapping.apply(1)
        };
      case 0:
        //smallest
        return {
          name: `${this.label} <= ${this.numberFormat(threshold[0])}`,
          color: this.colorMapping.apply(0)
        };
      default:
        return {
          name: `${this.numberFormat(threshold[treshholdIndex - 1])} <= ${this.label} <= ${this.numberFormat(threshold[treshholdIndex])}`,
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
