import {LazyBoxPlotData} from '../internal';
import {toolbar, SortByDefault, dialogAddons} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import ValueColumn, {dataLoaded} from './ValueColumn';
import {IKeyValue} from './IArrayColumn';
import {IDataRow} from './interfaces';
import {isDummyNumberFilter, restoreFilter} from './internal';
import {
  compareBoxPlot, DEFAULT_FORMATTER, EAdvancedSortMethod, getBoxPlotNumber, IAdvancedBoxPlotColumn, INumberDesc,
  INumberFilter, noNumberFilter
} from './INumberColumn';
import {default as MapColumn, IMapColumnDesc} from './MapColumn';
import {createMappingFunction, IMappingFunction, restoreMapping, ScaleMappingFunction} from './MappingFunction';
import {isMissingValue} from './missing';
import NumberColumn, {colorMappingChanged} from './NumberColumn';
import {IAdvancedBoxPlotData} from '../internal/math';
import {IEventListener} from '../internal/AEventDispatcher';
import {IColorMappingFunction, restoreColorMapping, createColorMappingFunction} from './ColorMappingFunction';


export interface INumberMapDesc extends INumberDesc {
  readonly sort?: EAdvancedSortMethod;
}

export declare type INumberMapColumnDesc = INumberMapDesc & IMapColumnDesc<number>;

/**
 * emitted when the mapping property changes
 * @asMemberOf NumberMapColumn
 * @event
 */
export declare function mappingChanged(previous: IMappingFunction, current: IMappingFunction): void;

/**
 * emitted when the sort method property changes
 * @asMemberOf NumberMapColumn
 * @event
 */
export declare function sortMethodChanged(previous: EAdvancedSortMethod, current: EAdvancedSortMethod): void;


@toolbar('filterNumber', 'colorMapped', 'editMapping')
@dialogAddons('sort', 'sortNumbers')
@SortByDefault('descending')
export default class NumberMapColumn extends MapColumn<number> implements IAdvancedBoxPlotColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;
  static readonly EVENT_COLOR_MAPPING_CHANGED = NumberColumn.EVENT_COLOR_MAPPING_CHANGED;
  static readonly EVENT_SORTMETHOD_CHANGED = NumberColumn.EVENT_SORTMETHOD_CHANGED;

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
    this.colorMapping = restoreColorMapping(this.color, desc);
    this.sort = desc.sort || EAdvancedSortMethod.median;
    this.setDefaultRenderer('mapbars');
  }

  compare(a: IDataRow, b: IDataRow): number {
    return compareBoxPlot(this, a, b);
  }

  getBoxPlotData(row: IDataRow): IAdvancedBoxPlotData | null {
    const data = this.getRawValue(row);
    if (data == null) {
      return null;
    }
    return new LazyBoxPlotData(data.map((d) => d.value), this.mapping);
  }

  getRange() {
    return this.mapping.getRange(DEFAULT_FORMATTER);
  }

  getRawBoxPlotData(row: IDataRow): IAdvancedBoxPlotData | null {
    const data = this.getRawValue(row);
    if (data == null) {
      return null;
    }
    return new LazyBoxPlotData(data.map((d) => d.value));
  }

  getNumber(row: IDataRow): number {
    return getBoxPlotNumber(this, row, 'normalized');
  }

  getRawNumber(row: IDataRow): number {
    return getBoxPlotNumber(this, row, 'raw');
  }

  getValue(row: IDataRow) {
    const values = this.getRawValue(row);
    return values.map(({key, value}) => ({key, value: isMissingValue(value) ? NaN : this.mapping.apply(value)}));
  }

  getRawValue(row: IDataRow): IKeyValue<number>[] {
    const r = super.getValue(row);
    return r == null ? [] : r;
  }

  getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    return format === 'json' ? this.getRawValue(row) : super.getExportValue(row, format);
  }

  getLabels(row: IDataRow) {
    const v = this.getValue(row);
    return v.map(({key, value}) => ({key, value: DEFAULT_FORMATTER(value)}));
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
      this.currentFilter = restoreFilter(dump.filter);
    }
    if (dump.map) {
      this.mapping = createMappingFunction(dump.map);
    } else if (dump.domain) {
      this.mapping = new ScaleMappingFunction(dump.domain, 'linear', dump.range || [0, 1]);
    }
    if (dump.colorMapping) {
      this.colorMapping = createColorMappingFunction(this.color, dump.colorMapping);
    }
  }

  protected createEventList() {
    return super.createEventList().concat([NumberMapColumn.EVENT_COLOR_MAPPING_CHANGED, NumberMapColumn.EVENT_MAPPING_CHANGED, NumberMapColumn.EVENT_SORTMETHOD_CHANGED]);
  }

  on(type: typeof NumberMapColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged | null): this;
  on(type: typeof NumberMapColumn.EVENT_MAPPING_CHANGED, listener: typeof mappingChanged | null): this;
  on(type: typeof NumberMapColumn.EVENT_SORTMETHOD_CHANGED, listener: typeof sortMethodChanged | null): this;
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

  setFilter(value: INumberFilter = {min: -Infinity, max: +Infinity, filterMissing: false}) {
    NumberColumn.prototype.setFilter.call(this, value);
  }

  filter(row: IDataRow) {
    return NumberColumn.prototype.filter.call(this, row);
  }
}

