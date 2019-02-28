import {format} from 'd3-format';
import {boxplotBuilder, IAdvancedBoxPlotData, IEventListener} from '../internal';
import {dialogAddons, SortByDefault, toolbar} from './annotations';
import ArrayColumn, {IArrayColumnDesc} from './ArrayColumn';
import {createColorMappingFunction, restoreColorMapping} from './ColorMappingFunction';
import Column, {dirty, dirtyCaches, dirtyHeader, dirtyValues, groupRendererChanged, labelChanged, metaDataChanged, rendererTypeChanged, summaryRendererChanged, visibilityChanged, widthChanged} from './Column';
import {IArrayDesc} from './IArrayColumn';
import {IDataRow, ECompareValueType} from './interfaces';
import {DEFAULT_FORMATTER, getBoxPlotNumber, isDummyNumberFilter, noNumberFilter, restoreNumberFilter, toCompareBoxPlotValue} from './internalNumber';
import {EAdvancedSortMethod, IColorMappingFunction, IMappingFunction, INumberDesc, INumberFilter, INumbersColumn} from './INumberColumn';
import {createMappingFunction, restoreMapping, ScaleMappingFunction} from './MappingFunction';
import {isMissingValue} from './missing';
import NumberColumn from './NumberColumn';
import ValueColumn, {dataLoaded} from './ValueColumn';


export interface INumbersDesc extends IArrayDesc, INumberDesc {
  readonly sort?: EAdvancedSortMethod;
}

export declare type INumbersColumnDesc = INumbersDesc & IArrayColumnDesc<number>;

/**
 * emitted when the mapping property changes
 * @asMemberOf NumbersColumn
 * @event
 */
declare function mappingChanged(previous: IMappingFunction, current: IMappingFunction): void;
/**
 * emitted when the color mapping property changes
 * @asMemberOf NumbersColumn
 * @event
 */
declare function colorMappingChanged(previous: IColorMappingFunction, current: IColorMappingFunction): void;

/**
 * emitted when the sort method property changes
 * @asMemberOf NumbersColumn
 * @event
 */
declare function sortMethodChanged(previous: EAdvancedSortMethod, current: EAdvancedSortMethod): void;

/**
 * emitted when the filter property changes
 * @asMemberOf NumbersColumn
 * @event
 */
declare function filterChanged(previous: INumberFilter | null, current: INumberFilter | null): void;

@toolbar('filterNumber', 'colorMapped', 'editMapping')
@dialogAddons('sort', 'sortNumbers')
@SortByDefault('descending')
export default class NumbersColumn extends ArrayColumn<number> implements INumbersColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;
  static readonly EVENT_COLOR_MAPPING_CHANGED = NumberColumn.EVENT_COLOR_MAPPING_CHANGED;
  static readonly EVENT_SORTMETHOD_CHANGED = NumberColumn.EVENT_SORTMETHOD_CHANGED;
  static readonly EVENT_FILTER_CHANGED = NumberColumn.EVENT_FILTER_CHANGED;

  static readonly CENTER = 0;

  private readonly numberFormat: (n: number) => string = DEFAULT_FORMATTER;

  private sort: EAdvancedSortMethod;
  private mapping: IMappingFunction;
  private original: IMappingFunction;
  private colorMapping: IColorMappingFunction;
  /**
   * currently active filter
   * @type {{min: number, max: number}}
   * @private
   */
  private currentFilter: INumberFilter = noNumberFilter();

  constructor(id: string, desc: Readonly<INumbersColumnDesc>) {
    super(id, desc);
    this.mapping = restoreMapping(desc);
    this.original = this.mapping.clone();
    this.colorMapping = restoreColorMapping(desc);

    if (desc.numberFormat) {
      this.numberFormat = format(desc.numberFormat);
    }

    this.sort = desc.sort || EAdvancedSortMethod.median;

    // better initialize the default with based on the data length
    if (this.dataLength) {
      this.setDefaultWidth(Math.min(Math.max(100, this.dataLength! * 10), 500));
    }
    this.setDefaultRenderer('heatmap');
    this.setDefaultGroupRenderer('heatmap');
    this.setDefaultSummaryRenderer('histogram');
  }

  getNumberFormat() {
    return this.numberFormat;
  }

  toCompareValue(row: IDataRow): number {
    return toCompareBoxPlotValue(this, row);
  }

  toCompareValueType() {
    return ECompareValueType.FLOAT;
  }

  getRawNumbers(row: IDataRow) {
    return this.getRawValue(row);
  }

  getBoxPlotData(row: IDataRow): IAdvancedBoxPlotData | null {
    const data = this.getRawValue(row);
    if (data == null) {
      return null;
    }
    const b = boxplotBuilder();
    for (const d of data) {
      b.push(isMissingValue(d) ? NaN : this.mapping.apply(d));
    }
    return b.build();
  }

  getRange() {
    return this.mapping.getRange(this.numberFormat);
  }

  getRawBoxPlotData(row: IDataRow): IAdvancedBoxPlotData | null {
    const data = this.getRawValue(row);
    if (data == null) {
      return null;
    }
    const b = boxplotBuilder();
    for (const d of data) {
      b.push(isMissingValue(d) ? NaN : d);
    }
    return b.build();
  }

  getNumbers(row: IDataRow) {
    return this.getValues(row);
  }

  getNumber(row: IDataRow): number {
    return getBoxPlotNumber(this, row, 'normalized');
  }

  getRawNumber(row: IDataRow): number {
    return getBoxPlotNumber(this, row, 'raw');
  }

  getValue(row: IDataRow) {
    const v = this.getValues(row);
    return v.every(isNaN) ? null : v;
  }

  getValues(row: IDataRow) {
    return this.getRawValue(row).map((d) => isNaN(d) ? NaN : this.mapping.apply(d));
  }

  iterNumber(row: IDataRow) {
    return this.getNumbers(row);
  }

  iterRawNumber(row: IDataRow) {
    return this.getRawNumbers(row);
  }

  getRawValue(row: IDataRow) {
    const r = super.getRaw(row);
    return r == null ? [] : r.map((d) => isMissingValue(d) ? NaN : +d);
  }

  getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    return format === 'json' ? this.getRawValue(row) : super.getExportValue(row, format);
  }

  getLabels(row: IDataRow) {
    return this.getValues(row).map(this.numberFormat);
  }

  getSortMethod() {
    return this.sort;
  }

  setSortMethod(sort: EAdvancedSortMethod) {
    if (this.sort === sort) {
      return;
    }
    this.fire([NumbersColumn.EVENT_SORTMETHOD_CHANGED, NumberColumn.EVENT_DIRTY_HEADER, NumberColumn.EVENT_DIRTY_VALUES, NumbersColumn.EVENT_DIRTY_CACHES, NumberColumn.EVENT_DIRTY], this.sort, this.sort = sort);
    // sort by me if not already sorted by me
    if (!this.isSortedByMe().asc) {
      this.sortByMe();
    }
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.sortMethod = this.getSortMethod();
    r.filter = !isDummyNumberFilter(this.currentFilter) ? this.currentFilter : null;
    r.map = this.mapping.dump();
    r.colorMapping = this.colorMapping.dump();
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (dump.sortMethod) {
      this.sort = dump.sortMethod;
    }
    if (dump.filter) {
      this.currentFilter = restoreNumberFilter(dump.filter);
    }
    if (dump.map) {
      this.mapping = createMappingFunction(dump.map);
    } else if (dump.domain) {
      this.mapping = new ScaleMappingFunction(dump.domain, 'linear', dump.range || [0, 1]);
    }
    if (dump.colorMapping) {
      this.colorMapping = createColorMappingFunction(dump.colorMapping);
    }
  }

  protected createEventList() {
    return super.createEventList().concat([NumbersColumn.EVENT_COLOR_MAPPING_CHANGED, NumbersColumn.EVENT_MAPPING_CHANGED, NumbersColumn.EVENT_SORTMETHOD_CHANGED, NumbersColumn.EVENT_FILTER_CHANGED]);
  }

  on(type: typeof NumbersColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged | null): this;
  on(type: typeof NumbersColumn.EVENT_MAPPING_CHANGED, listener: typeof mappingChanged | null): this;
  on(type: typeof NumbersColumn.EVENT_SORTMETHOD_CHANGED, listener: typeof sortMethodChanged | null): this;
  on(type: typeof NumbersColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
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
    this.fire([NumbersColumn.EVENT_MAPPING_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY], this.mapping.clone(), this.mapping = mapping);
  }

  getColor(row: IDataRow) {
    return NumberColumn.prototype.getColor.call(this, row);
  }

  getColorMapping() {
    return this.colorMapping.clone();
  }

  setColorMapping(mapping: IColorMappingFunction) {
    if (this.colorMapping.eq(mapping)) {
      return;
    }
    this.fire([NumbersColumn.EVENT_COLOR_MAPPING_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY], this.colorMapping.clone(), this.colorMapping = mapping);
  }

  isFiltered() {
    return NumberColumn.prototype.isFiltered.call(this);
  }

  getFilter(): INumberFilter {
    return NumberColumn.prototype.getFilter.call(this);
  }

  setFilter(value: INumberFilter | null) {
    NumberColumn.prototype.setFilter.call(this, value);
  }

  filter(row: IDataRow) {
    return NumberColumn.prototype.filter.call(this, row);
  }

  clearFilter() {
    return NumberColumn.prototype.clearFilter.call(this);
  }
}

