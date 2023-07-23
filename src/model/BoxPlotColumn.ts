import { format } from 'd3-format';
import type { IBoxPlotData, IEventListener, ISequence } from '../internal';
import { Category, dialogAddons, SortByDefault, toolbar } from './annotations';
import Column, {
  dirty,
  dirtyCaches,
  dirtyHeader,
  dirtyValues,
  groupRendererChanged,
  labelChanged,
  metaDataChanged,
  rendererTypeChanged,
  summaryRendererChanged,
  visibilityChanged,
  widthChanged,
} from './Column';
import {
  type IDataRow,
  ECompareValueType,
  type IValueColumnDesc,
  type ITypeFactory,
  type IColumnDump,
  type ITypedDump,
} from './interfaces';
import {
  ESortMethod,
  type IBoxPlotColumn,
  type INumberDesc,
  type INumberFilter,
  type IColorMappingFunction,
  type IMappingFunction,
  type IMapAbleDesc,
} from './INumberColumn';
import { restoreMapping } from './MappingFunction';
import NumberColumn from './NumberColumn';
import type { dataLoaded } from './ValueColumn';
import ValueColumn from './ValueColumn';
import {
  DEFAULT_FORMATTER,
  noNumberFilter,
  toCompareBoxPlotValue,
  getBoxPlotNumber,
  isDummyNumberFilter,
  restoreNumberFilter,
} from './internalNumber';
import { restoreTypedValue, restoreValue } from './diff';

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

@toolbar('rename', 'clone', 'sort', 'sortBy', 'filterNumber', 'colorMapped', 'editMapping')
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
  private readonly defaultColorMapping: ITypedDump | string;
  private original: Readonly<IMappingFunction>;
  private deriveMapping: readonly boolean[];

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
    this.deriveMapping = this.mapping.domain.map((d) => d == null || Number.isNaN(d));
    this.colorMapping = factory.colorMappingFunction(desc.colorMapping);
    this.defaultColorMapping = this.colorMapping.toJSON();

    if (desc.numberFormat) {
      this.numberFormat = format(desc.numberFormat);
    }

    this.sort = desc.sort || ESortMethod.min;
  }

  override onDataUpdate(rows: ISequence<IDataRow>): void {
    super.onDataUpdate(rows);
    if (!this.deriveMapping.some(Boolean)) {
      return;
    }
    // hook for listening to data updates
    const minMax = rows
      .map((row) => this.getRawValue(row))
      .reduce(
        (acc, v) => {
          if (v == null) {
            return acc;
          }
          if (v.min < acc.min) {
            acc.min = v.min;
          }
          if (v.max > acc.max) {
            acc.max = v.max;
          }
          return acc;
        },
        { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
      );

    const domain = this.mapping.domain.slice();
    if (this.deriveMapping[0]) {
      domain[0] = minMax.min;
    }
    if (this.deriveMapping[this.deriveMapping.length - 1]) {
      domain[domain.length - 1] = minMax.max;
    }
    this.mapping.domain = domain;
    (this.original as IMappingFunction).domain = domain;
  }

  getNumberFormat() {
    return this.numberFormat;
  }

  override toCompareValue(row: IDataRow): number {
    return toCompareBoxPlotValue(this, row);
  }

  override toCompareValueType() {
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

  override getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    return format === 'json' ? this.getRawValue(row) : super.getExportValue(row, format);
  }

  override getValue(row: IDataRow) {
    const v = this.getRawValue(row);
    if (v == null) {
      return null;
    }
    const r: IBoxPlotData = {
      min: this.mapping.apply(v.min),
      max: this.mapping.apply(v.max),
      median: this.mapping.apply(v.median),
      q1: this.mapping.apply(v.q1),
      q3: this.mapping.apply(v.q3),
    };
    if (v.outlier) {
      Object.assign(r, {
        outlier: v.outlier.map((d) => this.mapping.apply(d)),
      });
    }
    if (v.whiskerLow != null) {
      Object.assign(r, {
        whiskerLow: this.mapping.apply(v.whiskerLow),
      });
    }
    if (v.whiskerHigh != null) {
      Object.assign(r, {
        whiskerHigh: this.mapping.apply(v.whiskerHigh),
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

  override getLabel(row: IDataRow): string {
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
    this.fire(BoxPlotColumn.EVENT_SORTMETHOD_CHANGED, this.sort, (this.sort = sort));
    // sort by me if not already sorted by me
    if (!this.isSortedByMe().asc) {
      this.sortByMe();
    }
  }

  override toJSON() {
    const r = super.toJSON();
    r.sortMethod = this.sort;
    r.colorMapping = this.colorMapping.toJSON();
    r.filter = this.getFilter();
    r.map = this.mapping.toJSON();
    return r;
  }

  override restore(dump: IColumnDump, factory: ITypeFactory): Set<string> {
    const changed = super.restore(dump, factory);
    this.sort = restoreValue(dump.sortMethod, this.sort, changed, BoxPlotColumn.EVENT_SORTMETHOD_CHANGED);

    this.colorMapping = restoreTypedValue(
      dump.colorMapping,
      this.colorMapping,
      factory.colorMappingFunction.bind(factory),
      changed,
      [
        BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
      ]
    );

    if (dump.filter) {
      this.currentFilter = restoreValue(restoreNumberFilter(dump.filter), this.currentFilter, changed, [
        NumberColumn.EVENT_FILTER_CHANGED,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY,
      ]);
    }
    if (dump.map || dump.domain) {
      const v = restoreMapping(dump as unknown as IMapAbleDesc, factory);
      const current = this.mapping.toJSON();
      const target = restoreValue(v.toJSON(), current, changed, [
        BoxPlotColumn.EVENT_MAPPING_CHANGED,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
      ]);
      if (target !== current) {
        this.mapping = v;
      }
    }
    return changed;
  }

  protected override createEventList() {
    return super
      .createEventList()
      .concat([
        BoxPlotColumn.EVENT_SORTMETHOD_CHANGED,
        BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED,
        BoxPlotColumn.EVENT_MAPPING_CHANGED,
        BoxPlotColumn.EVENT_FILTER_CHANGED,
      ]);
  }

  override on(
    type: typeof BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED,
    listener: typeof colorMappingChanged_BPC | null
  ): this;
  override on(type: typeof BoxPlotColumn.EVENT_MAPPING_CHANGED, listener: typeof mappingChanged_BPC | null): this;
  override on(type: typeof BoxPlotColumn.EVENT_SORTMETHOD_CHANGED, listener: typeof sortMethodChanged_BPC | null): this;
  override on(type: typeof BoxPlotColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged_BPC | null): this;
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
    this.deriveMapping = [];
    this.fire(
      [
        BoxPlotColumn.EVENT_MAPPING_CHANGED,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
      ],
      this.mapping.clone(),
      (this.mapping = mapping)
    );
  }

  override getColor(row: IDataRow) {
    return NumberColumn.prototype.getColor.call(this, row);
  }

  getColorMapping() {
    return this.colorMapping.clone();
  }

  setColorMapping(mapping: IColorMappingFunction) {
    if (this.colorMapping.eq(mapping)) {
      return;
    }
    this.fire(
      [
        BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
      ],
      this.colorMapping.clone(),
      (this.colorMapping = mapping)
    );
  }

  override isFiltered() {
    return NumberColumn.prototype.isFiltered.call(this);
  }

  getFilter(): INumberFilter {
    return NumberColumn.prototype.getFilter.call(this);
  }

  setFilter(value: INumberFilter | null) {
    NumberColumn.prototype.setFilter.call(this, value);
  }

  override filter(row: IDataRow) {
    return NumberColumn.prototype.filter.call(this, row);
  }

  override clearFilter() {
    return NumberColumn.prototype.clearFilter.call(this);
  }
}
