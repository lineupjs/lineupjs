import {toolbar, SortByDefault, dialogAddons} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged, dirtyCaches} from './Column';
import ValueColumn, {dataLoaded} from './ValueColumn';
import {IKeyValue} from './IArrayColumn';
import {IDataRow, ECompareValueType} from './interfaces';
import {
  EAdvancedSortMethod, IAdvancedBoxPlotColumn, INumberDesc,
  INumberFilter,
  IMappingFunction,
  IColorMappingFunction} from './INumberColumn';
import {default as MapColumn, IMapColumnDesc} from './MapColumn';
import {createMappingFunction, restoreMapping, ScaleMappingFunction} from './MappingFunction';
import {isMissingValue} from './missing';
import NumberColumn from './NumberColumn';
import {IEventListener, IAdvancedBoxPlotData, boxplotBuilder} from '../internal';
import {restoreColorMapping, createColorMappingFunction} from './ColorMappingFunction';
import {format} from 'd3-format';
import {DEFAULT_FORMATTER, noNumberFilter, toCompareBoxPlotValue, getBoxPlotNumber, isDummyNumberFilter, restoreNumberFilter} from './internalNumber';


export interface INumberMapDesc extends INumberDesc {
  readonly sort?: EAdvancedSortMethod;
}

export declare type INumberMapColumnDesc = INumberMapDesc & IMapColumnDesc<number>;

/**
 * emitted when the mapping property changes
 * @asMemberOf NumberMapColumn
 * @event
 */
declare function mappingChanged(previous: IMappingFunction, current: IMappingFunction): void;
/**
 * emitted when the color mapping property changes
 * @asMemberOf NumberMapColumn
 * @event
 */
declare function colorMappingChanged(previous: IColorMappingFunction, current: IColorMappingFunction): void;

/**
 * emitted when the sort method property changes
 * @asMemberOf NumberMapColumn
 * @event
 */
declare function sortMethodChanged(previous: EAdvancedSortMethod, current: EAdvancedSortMethod): void;

/**
 * emitted when the filter property changes
 * @asMemberOf NumberMapColumn
 * @event
 */
declare function filterChanged(previous: INumberFilter | null, current: INumberFilter | null): void;

@toolbar('filterNumber', 'colorMapped', 'editMapping')
@dialogAddons('sort', 'sortNumbers')
@SortByDefault('descending')
export default class NumberMapColumn extends MapColumn<number> implements IAdvancedBoxPlotColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;
  static readonly EVENT_COLOR_MAPPING_CHANGED = NumberColumn.EVENT_COLOR_MAPPING_CHANGED;
  static readonly EVENT_SORTMETHOD_CHANGED = NumberColumn.EVENT_SORTMETHOD_CHANGED;
  static readonly EVENT_FILTER_CHANGED = NumberColumn.EVENT_FILTER_CHANGED;

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

  constructor(id: string, desc: Readonly<INumberMapColumnDesc>) {
    super(id, desc);
    this.mapping = restoreMapping(desc);
    this.original = this.mapping.clone();
    this.colorMapping = restoreColorMapping(desc);
    this.sort = desc.sort || EAdvancedSortMethod.median;

    if (desc.numberFormat) {
      this.numberFormat = format(desc.numberFormat);
    }

    this.setDefaultRenderer('mapbars');
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

  getBoxPlotData(row: IDataRow): IAdvancedBoxPlotData | null {
    const data = this.getRawValue(row);
    if (data == null) {
      return null;
    }
    const b = boxplotBuilder();
    for (const d of data) {
      b.push(isMissingValue(d.value) ? NaN : this.mapping.apply(d.value));
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
      b.push(isMissingValue(d.value) ? NaN : d.value);
    }
    return b.build();
  }

  getNumber(row: IDataRow): number {
    return getBoxPlotNumber(this, row, 'normalized');
  }

  getRawNumber(row: IDataRow): number {
    return getBoxPlotNumber(this, row, 'raw');
  }

  iterNumber(row: IDataRow) {
    const r = this.getValue(row);
    return r ? r.map((d) => d.value) : [NaN];
  }

  iterRawNumber(row: IDataRow) {
    const r = this.getRawValue(row);
    return r ? r.map((d) => d.value) : [NaN];
  }

  getValue(row: IDataRow) {
    const values = this.getRawValue(row);
    return values.length === 0 ? null : values.map(({key, value}) => ({key, value: isMissingValue(value) ? NaN : this.mapping.apply(value)}));
  }

  getRawValue(row: IDataRow): IKeyValue<number>[] {
    const r = super.getValue(row);
    return r == null ? [] : r;
  }

  getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    return format === 'json' ? this.getRawValue(row) : super.getExportValue(row, format);
  }

  getLabels(row: IDataRow) {
    const v = this.getRawValue(row);
    return v.map(({key, value}) => ({key, value: this.numberFormat(value)}));
  }

  getSortMethod() {
    return this.sort;
  }

  setSortMethod(sort: EAdvancedSortMethod) {
    if (this.sort === sort) {
      return;
    }
    this.fire([NumberMapColumn.EVENT_SORTMETHOD_CHANGED], this.sort, this.sort = sort);
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
    return super.createEventList().concat([NumberMapColumn.EVENT_COLOR_MAPPING_CHANGED, NumberMapColumn.EVENT_MAPPING_CHANGED, NumberMapColumn.EVENT_SORTMETHOD_CHANGED, NumberMapColumn.EVENT_FILTER_CHANGED]);
  }

  on(type: typeof NumberMapColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged | null): this;
  on(type: typeof NumberMapColumn.EVENT_MAPPING_CHANGED, listener: typeof mappingChanged | null): this;
  on(type: typeof NumberMapColumn.EVENT_SORTMETHOD_CHANGED, listener: typeof sortMethodChanged | null): this;
  on(type: typeof NumberMapColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
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
    this.fire([NumberMapColumn.EVENT_MAPPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.mapping.clone(), this.mapping = mapping);
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
    this.fire([NumberMapColumn.EVENT_COLOR_MAPPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.colorMapping.clone(), this.colorMapping = mapping);
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

