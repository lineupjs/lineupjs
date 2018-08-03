import {format} from 'd3-format';
import {IBoxPlotData} from '../internal';
import {Category, toolbar, SortByDefault, dialogAddons} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import ValueColumn, {IValueColumnDesc, dataLoaded} from './ValueColumn';
import {IDataRow} from './interfaces';
import {isDummyNumberFilter, restoreFilter} from './internal';
import {
  compareBoxPlot, ESortMethod, getBoxPlotNumber, IBoxPlotColumn, INumberFilter, noNumberFilter
} from './INumberColumn';
import {
  createMappingFunction, IMapAbleDesc, IMappingFunction, restoreMapping,
  ScaleMappingFunction
} from './MappingFunction';
import NumberColumn, {colorMappingChanged} from './NumberColumn';
import {IEventListener} from '../internal/AEventDispatcher';
import {IColorMappingFunction, restoreColorMapping, createColorMappingFunction} from './ColorMappingFunction';


export interface IBoxPlotDesc extends IMapAbleDesc {
  sort?: ESortMethod;
}

export declare type IBoxPlotColumnDesc = IBoxPlotDesc & IValueColumnDesc<IBoxPlotData>;


/**
 * emitted when the sort method property changes
 * @asMemberOf BoxPlotColumn
 * @event
 */
export declare function sortMethodChanged(previous: ESortMethod, current: ESortMethod): void;

/**
 * emitted when the mapping property changes
 * @asMemberOf BoxPlotColumn
 * @event
 */
export declare function mappingChanged(previous: IMappingFunction, current: IMappingFunction): void;


@toolbar('filterMapped', 'colorMapped')
@dialogAddons('sort', 'sortBoxPlot')
@Category('array')
@SortByDefault('descending')
export default class BoxPlotColumn extends ValueColumn<IBoxPlotData> implements IBoxPlotColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;
  static readonly EVENT_COLOR_MAPPING_CHANGED = NumberColumn.EVENT_COLOR_MAPPING_CHANGED;
  static readonly EVENT_SORTMETHOD_CHANGED = 'sortMethodChanged';

  static readonly DEFAULT_FORMATTER = format('.3n');

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


  constructor(id: string, desc: Readonly<IBoxPlotColumnDesc>) {
    super(id, desc);
    this.mapping = restoreMapping(desc);
    this.original = this.mapping.clone();
    this.colorMapping = restoreColorMapping(this.color, desc);

    this.sort = desc.sort || ESortMethod.min;

  }

  compare(a: IDataRow, b: IDataRow): number {
    return compareBoxPlot(this, a, b);
  }

  getBoxPlotData(row: IDataRow): IBoxPlotData | null {
    return this.getValue(row);
  }

  getRange() {
    return this.mapping.getRange(BoxPlotColumn.DEFAULT_FORMATTER);
  }

  getRawBoxPlotData(row: IDataRow): IBoxPlotData | null {
    return this.getRawValue(row);
  }

  getRawValue(row: IDataRow) {
    return super.getValue(row);
  }

  getValue(row: IDataRow) {
    const v = this.getRawValue(row);
    if (v == null) {
      return v;
    }
    return {
      min: this.mapping.apply(v.min),
      max: this.mapping.apply(v.max),
      median: this.mapping.apply(v.median),
      q1: this.mapping.apply(v.q1),
      q3: this.mapping.apply(v.q3)
    };
  }

  getNumber(row: IDataRow): number {
    return getBoxPlotNumber(this, row, 'normalized');
  }

  getRawNumber(row: IDataRow): number {
    return getBoxPlotNumber(this, row, 'raw');
  }

  getLabel(row: IDataRow): string {
    const v = this.getRawValue(row);
    if (v == null) {
      return '';
    }
    const f = BoxPlotColumn.DEFAULT_FORMATTER;
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
    return super.createEventList().concat([BoxPlotColumn.EVENT_SORTMETHOD_CHANGED, BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED, BoxPlotColumn.EVENT_MAPPING_CHANGED]);
  }

  on(type: typeof BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged | null): this;
  on(type: typeof BoxPlotColumn.EVENT_MAPPING_CHANGED, listener: typeof mappingChanged | null): this;
  on(type: typeof BoxPlotColumn.EVENT_SORTMETHOD_CHANGED, listener: typeof sortMethodChanged | null): this;
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
    this.fire([BoxPlotColumn.EVENT_MAPPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.mapping.clone(), this.mapping = mapping);
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
    this.fire([BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.colorMapping.clone(), this.colorMapping = mapping);
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

