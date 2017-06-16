/**
 * Created by bikramkawan on 24/11/2016.
 */
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import Column from './Column';
import {format} from 'd3';
import NumberColumn, {INumberColumn, IMappingFunction, createMappingFunction, ScaleMappingFunction, IMapAbleColumn, INumberFilter, noNumberFilter} from './NumberColumn';

export const SORT_METHOD = {
  min: 'min',
  max: 'max',
  median: 'median',
  q1: 'q1',
  q3: 'q3'
};

// till it can be more specific
export declare type SortMethod = string;


export interface IBoxPlotColumn extends INumberColumn {
  getBoxPlotData(row: any, index: number): IBoxPlotData;
  getRawBoxPlotData(row: any, index: number): IBoxPlotData;
  getSortMethod(): string;
  setSortMethod(sortMethod: string);
}

export interface IBoxPlotColumnDesc extends IValueColumnDesc<IBoxPlotData> {
  /**
   * dump of mapping function
   */
  readonly map?: any;
  /**
   * either map or domain should be available
   */
  readonly domain?: [number, number];
  /**
   * @default [0,1]
   */
  readonly range?: [number, number];

  readonly sort?: string;
}

export interface IBoxPlotData {
  readonly min: number;
  readonly max: number;
  readonly median: number;
  readonly q1: number;
  readonly q3: number;
}


export function compareBoxPlot(col: IBoxPlotColumn, a: any, b: any, aIndex: number, bIndex: number) {
  const aVal = (col.getBoxPlotData(a, aIndex));
  const bVal = (col.getBoxPlotData(b, bIndex));
  if (aVal === null) {
    return bVal === null ? 0 : +1;
  }
  if (bVal === null) {
    return -1;
  }
  const method = col.getSortMethod();
  return aVal[method] - bVal[method];
}

export function getBoxPlotNumber(col: IBoxPlotColumn, row: any, index: number, mode: 'raw'|'normalized') {
  const data = mode === 'normalized' ? col.getBoxPlotData(row, index) : col.getRawBoxPlotData(row, index);
  if (data === null) {
    return NaN;
  }
  return data[col.getSortMethod()];
}


export default class BoxPlotColumn extends ValueColumn<IBoxPlotData> implements IBoxPlotColumn, IMapAbleColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;
  static readonly DEFAULT_FORMATTER = format('.3n');

  private sort: SortMethod;

  private mapping: IMappingFunction;

  private original: IMappingFunction;
  /**
   * currently active filter
   * @type {{min: number, max: number}}
   * @private
   */
  private currentFilter: INumberFilter = noNumberFilter();


  constructor(id: string, desc: IBoxPlotColumnDesc) {
    super(id, desc);
    if (desc.map) {
      this.mapping = createMappingFunction(desc.map);
    } else if (desc.domain) {
      this.mapping = new ScaleMappingFunction(desc.domain, 'linear', desc.range || [0, 1]);
    }
    this.original = this.mapping.clone();

    this.sort = desc.sort || SORT_METHOD.min;

    this.setRendererList([
      {type: 'boxplot', label: 'Boxplot'},
      {type: 'number', label: 'Bar'},
      {type: 'circle', label: 'Circle'}
    ]);

  }

  compare(a: any, b: any, aIndex: number, bIndex: number): number {
    return compareBoxPlot(this, a, b, aIndex, bIndex);
  }

  getBoxPlotData(row: any, index: number): IBoxPlotData {
    return this.getValue(row, index);
  }

  getRawBoxPlotData(row: any, index: number): IBoxPlotData {
    return this.getRawValue(row, index);
  }

  getRawValue(row: any, index: number) {
    return super.getValue(row, index);
  }

  getValue(row: any, index: number) {
    const v = this.getRawValue(row, index);
    if (v === null) {
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

  getNumber(row: any, index: number) {
    return getBoxPlotNumber(this, row, index, 'normalized');
  }

  getRawNumber(row: any, index: number) {
    return getBoxPlotNumber(this, row, index, 'raw');
  }

  getLabel(row: any, index: number): string {
    const v = this.getRawValue(row, index);
    if (v === null) {
      return '';
    }
    const f = BoxPlotColumn.DEFAULT_FORMATTER;
    return `BoxPlot(min = ${f(v.min)}, q1 = ${f(v.q1)}, median = ${f(v.median)}, q3 = ${f(v.q3)}, max = ${f(v.max)})`;
  }

  getSortMethod() {
    return this.sort;
  }

  setSortMethod(sort: string) {
    if (this.sort === sort) {
      return;
    }
    this.fire([Column.EVENT_SORTMETHOD_CHANGED], this.sort, this.sort = sort);
    // sort by me if not already sorted by me
    if (this.findMyRanker().getSortCriteria().col !== this) {
      this.sortByMe();
    }
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.sortMethod = this.getSortMethod();
    r.filter = this.currentFilter;
    r.map = this.mapping.dump();
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column) {
    super.restore(dump, factory);
    if (dump.sortMethod) {
      this.sort = dump.sortMethod;
    }
    if (dump.filter) {
      this.currentFilter = dump.filter;
    }
    if (dump.map) {
      this.mapping = createMappingFunction(dump.map);
    } else if (dump.domain) {
      this.mapping = new ScaleMappingFunction(dump.domain, 'linear', dump.range || [0, 1]);
    }
  }

  protected createEventList() {
    return super.createEventList().concat([NumberColumn.EVENT_MAPPING_CHANGED]);
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

  isFiltered() {
    return NumberColumn.prototype.isFiltered.call(this);
  }

  getFilter(): INumberFilter {
    return NumberColumn.prototype.getFilter.call(this);
  }

  setFilter(value: INumberFilter = {min: -Infinity, max: +Infinity, filterMissing: false}) {
    NumberColumn.prototype.setFilter.call(this, value);
  }

  filter(row: any, index: number) {
    return NumberColumn.prototype.filter.call(this, row, index);
  }
}

