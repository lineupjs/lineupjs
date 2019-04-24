import {format} from 'd3-format';
import {IBoxPlotData, IEventListener} from '../internal';
import {Category, dialogAddons, SortByDefault, toolbar} from './annotations';
import Column, {dirty, dirtyCaches, dirtyHeader, dirtyValues, groupRendererChanged, labelChanged, metaDataChanged, rendererTypeChanged, summaryRendererChanged, visibilityChanged, widthChanged} from './Column';
import {IDataRow, ECompareValueType, IValueColumnDesc, ITypeFactory} from './interfaces';
import {ESortMethod, IBoxPlotColumn, INumberDesc, INumberFilter, IColorMappingFunction, IMappingFunction} from './INumberColumn';
import {restoreMapping} from './MappingFunction';
import NumberColumn from './NumberColumn';
import ValueColumn, {dataLoaded} from './ValueColumn';
import {DEFAULT_FORMATTER, noNumberFilter, toCompareBoxPlotValue, getBoxPlotNumber, isDummyNumberFilter, restoreNumberFilter} from './internalNumber';


export interface IBoxPlotDesc extends INumberDesc {
  sort?: ESortMethod;
}

export declare type IBoxPlotColumnDesc = IBoxPlotDesc & IValueColumnDesc<IBoxPlotData>;


/**
 * emitted when the sort method property changes
 * @asMemberOf BoxPlotColumn
 * @event
 */
export declare function sortMethodChanged_BPC(previous: ESortMethod, current: ESortMethod): void;

/**
 * emitted when the mapping property changes
 * @asMemberOf BoxPlotColumn
 * @event
 */
export declare function mappingChanged_BPC(previous: IMappingFunction, current: IMappingFunction): void;

/**
 * emitted when the color mapping property changes
 * @asMemberOf BoxPlotColumn
 * @event
 */
export declare function colorMappingChanged_BPC(previous: IColorMappingFunction, current: IColorMappingFunction): void;

/**
 * emitted when the filter property changes
 * @asMemberOf BoxPlotColumn
 * @event
 */
export declare function filterChanged_BPC(previous: INumberFilter | null, current: INumberFilter | null): void;


@toolbar('filterNumber', 'colorMapped', 'editMapping')
@dialogAddons('sort', 'sortBoxPlot')
@Category('array')
@SortByDefault('descending')
export default class BoxPlotColumn extends ValueColumn<IBoxPlotData> implements IBoxPlotColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;
  static readonly EVENT_COLOR_MAPPING_CHANGED = NumberColumn.EVENT_COLOR_MAPPING_CHANGED;
  static readonly EVENT_SORTMETHOD_CHANGED = NumberColumn.EVENT_SORTMETHOD_CHANGED;
  static readonly EVENT_FILTER_CHANGED = NumberColumn.EVENT_FILTER_CHANGED;

  private readonly numberFormat: (n: number) => string = DEFAULT_FORMATTER;

  private sort: ESortMethod;

  private mapping: IMappingFunction;
  private colorMapping: IColorMappingFunction;

  private original: Readonly<IMappingFunction>;
  /**
   * currently active filter
   * @type {{min: number, max: number}}
   * @private
   */
  private currentFilter: INumberFilter = noNumberFilter();


  constructor(id: string, desc: Readonly<IBoxPlotColumnDesc>, factory: ITypeFactory) {
    super(id, desc);
    this.mapping = restoreMapping(desc, factory);
    this.original = this.mapping.clone();
    this.colorMapping = factory.colorMappingFunction(desc.colorMapping);

    if (desc.numberFormat) {
      this.numberFormat = format(desc.numberFormat);
    }

    this.sort = desc.sort || ESortMethod.min;
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

  getBoxPlotData(row: IDataRow): IBoxPlotData | null {
    return this.getValue(row);
  }

  getRange() {
    return this.mapping.getRange(this.numberFormat);
  }

  getRawBoxPlotData(row: IDataRow): IBoxPlotData | null {
    return this.getRawValue(row);
  }

  getRawValue(row: IDataRow) {
    return super.getValue(row);
  }

  getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    return format === 'json' ? this.getRawValue(row) : super.getExportValue(row, format);
  }

  getValue(row: IDataRow) {
    const v = this.getRawValue(row);
    if (v == null) {
      return null;
    }
    const r: IBoxPlotData = {
      min: this.mapping.apply(v.min),
      max: this.mapping.apply(v.max),
      median: this.mapping.apply(v.median),
      q1: this.mapping.apply(v.q1),
      q3: this.mapping.apply(v.q3)
    };
    if (v.outlier) {
      Object.assign(r, {
        outlier: v.outlier.map((d) => this.mapping.apply(d))
      });
    }
    if (v.whiskerLow != null) {
      Object.assign(r, {
        whiskerLow: this.mapping.apply(v.whiskerLow)
      });
    }
    if (v.whiskerHigh != null) {
      Object.assign(r, {
        whiskerHigh: this.mapping.apply(v.whiskerHigh)
      });
    }
    return r;
  }

  getNumber(row: IDataRow): number {
    return getBoxPlotNumber(this, row, 'normalized');
  }

  getRawNumber(row: IDataRow): number {
    return getBoxPlotNumber(this, row, 'raw');
  }

  iterNumber(row: IDataRow) {
    return [this.getNumber(row)];
  }

  iterRawNumber(row: IDataRow) {
    return [this.getRawNumber(row)];
  }

  getLabel(row: IDataRow): string {
    const v = this.getRawValue(row);
    if (v == null) {
      return '';
    }
    const f = this.numberFormat;
    return `BoxPlot(min = ${f(v.min)}, q1 = ${f(v.q1)}, median = ${f(v.median)}, q3 = ${f(v.q3)}, max = ${f(v.max)})`;
  }

  getSortMethod() {
    return this.sort;
  }

  setSortMethod(sort: ESortMethod) {
    if (this.sort === sort) {
      return;
    }
    this.fire(BoxPlotColumn.EVENT_SORTMETHOD_CHANGED, this.sort, this.sort = sort);
    // sort by me if not already sorted by me
    if (!this.isSortedByMe().asc) {
      this.sortByMe();
    }
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.sortMethod = this.getSortMethod();
    r.filter = !isDummyNumberFilter(this.currentFilter) ? this.currentFilter : null;
    r.map = this.mapping.toJSON();
    r.colorMapping = this.colorMapping.toJSON();
    return r;
  }

  restore(dump: any, factory: ITypeFactory) {
    super.restore(dump, factory);
    if (dump.sortMethod) {
      this.sort = dump.sortMethod;
    }
    if (dump.filter) {
      this.currentFilter = restoreNumberFilter(dump.filter);
    }
    if (dump.map || dump.domain) {
      this.mapping = restoreMapping(dump, factory);
    }
    if (dump.colorMapping) {
      this.colorMapping = factory.colorMappingFunction(dump.colorMapping);
    }
  }

  protected createEventList() {
    return super.createEventList().concat([BoxPlotColumn.EVENT_SORTMETHOD_CHANGED, BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED, BoxPlotColumn.EVENT_MAPPING_CHANGED, BoxPlotColumn.EVENT_FILTER_CHANGED]);
  }

  on(type: typeof BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged_BPC | null): this;
  on(type: typeof BoxPlotColumn.EVENT_MAPPING_CHANGED, listener: typeof mappingChanged_BPC | null): this;
  on(type: typeof BoxPlotColumn.EVENT_SORTMETHOD_CHANGED, listener: typeof sortMethodChanged_BPC | null): this;
  on(type: typeof BoxPlotColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged_BPC | null): this;
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
    this.fire([BoxPlotColumn.EVENT_MAPPING_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY], this.mapping.clone(), this.mapping = mapping);
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
    this.fire([BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY], this.colorMapping.clone(), this.colorMapping = mapping);
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

