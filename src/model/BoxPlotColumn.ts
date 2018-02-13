/**
 * Created by bikramkawan on 24/11/2016.
 */
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import Column from './Column';
import {format} from 'd3';
import NumberColumn, {
  createMappingFunction,
  IMapAbleColumn,
  IMappingFunction,
  ScaleMappingFunction
} from './NumberColumn';
import {
  compareBoxPlot, getBoxPlotNumber, IBoxPlotColumn, IBoxPlotData, INumberFilter, isSameFilter, noNumberFilter,
  restoreFilter,
  SORT_METHOD,
  SortMethod
} from './INumberColumn';


export function isBoxPlotColumn(col: any): col is IBoxPlotColumn {
  return typeof (<IBoxPlotColumn>col).getBoxPlotData === 'function';
}

export interface IBoxPlotDesc {
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

export declare type IBoxPlotColumnDesc = IBoxPlotDesc & IValueColumnDesc<IBoxPlotData>;

export {IBoxPlotData} from './INumberColumn';


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

  }

  compare(a: any, b: any, aIndex: number, bIndex: number): number {
    return compareBoxPlot(this, a, b, aIndex, bIndex);
  }

  getBoxPlotData(row: any, index: number): IBoxPlotData | null {
    return this.getValue(row, index);
  }

  getRange() {
    return this.mapping.getRange(BoxPlotColumn.DEFAULT_FORMATTER);
  }

  getRawBoxPlotData(row: any, index: number): IBoxPlotData | null {
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

    const outliers = v.outlier? v.outlier : [];

    return {
      min: this.mapping.apply(v.min),
      max: this.mapping.apply(v.max),
      median: this.mapping.apply(v.median),
      q1: this.mapping.apply(v.q1),
      q3: this.mapping.apply(v.q3),
      outlier: outliers.map((outlier) => this.mapping.apply(outlier))
    };
  }

  getNumber(row: any, index: number): number {
    return getBoxPlotNumber(this, row, index, 'normalized');
  }

  getRawNumber(row: any, index: number): number {
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
    if (!this.isSortedByMe().asc) {
      this.sortByMe();
    }
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.sortMethod = this.getSortMethod();
    r.filter = !isSameFilter(this.currentFilter, noNumberFilter()) ? this.currentFilter : null;
    r.map = this.mapping.dump();
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

