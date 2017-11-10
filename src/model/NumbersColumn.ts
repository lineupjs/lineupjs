/**
 * Created by bikramkawan on 24/11/2016.
 */
import {ascending, format, mean, median, quantile, scale as d3scale} from 'd3';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import Column from './Column';
import {
  compareBoxPlot,
  getBoxPlotNumber,
  IBoxPlotColumn,
  IBoxPlotData,
  SORT_METHOD as BASE_SORT_METHOD,
  SortMethod
} from './BoxPlotColumn';
import NumberColumn, {
  createMappingFunction,
  IMapAbleColumn,
  IMappingFunction,
  INumberFilter,
  noNumberFilter,
  ScaleMappingFunction
} from './NumberColumn';
import {INumberColumn, isNumberColumn} from './INumberColumn';
import {isMissingValue} from './missing';


export const SORT_METHOD = Object.assign({
  mean: 'mean'
}, BASE_SORT_METHOD);

export interface IAdvancedBoxPlotData extends IBoxPlotData {
  readonly mean: number;
}


export interface IAdvancedBoxPlotColumn extends IBoxPlotColumn {
  getBoxPlotData(row: any, index: number): IAdvancedBoxPlotData | null;

  getRawBoxPlotData(row: any, index: number): IAdvancedBoxPlotData | null;
}

/**
 * helper class to lazily compute box plotdata out of a given number array
 */
export class LazyBoxPlotData implements IAdvancedBoxPlotData {
  private _sorted: number[] | null = null;
  private _outlier: number[] | null = null;
  private readonly values: number[];

  constructor(values: number[], private readonly scale?: IMappingFunction) {
    // filter out NaN
    this.values = values.filter((d) => !isMissingValue(d));
  }

  /**
   * lazy compute sorted array
   * @returns {number[]}
   */
  private get sorted() {
    if (this._sorted === null) {
      this._sorted = this.values.slice().sort(ascending);
    }
    return this._sorted;
  }

  private map(v: number) {
    return this.scale ? this.scale.apply(v) : v;
  }

  get min() {
    return this.map(Math.min(...this.values));
  }

  get max() {
    return this.map(Math.max(...this.values));
  }

  get median() {
    return this.map(median(this.sorted));
  }

  get q1() {
    return this.map(quantile(this.sorted, 0.25));
  }

  get q3() {
    return this.map(quantile(this.sorted, 0.75));
  }

  get mean() {
    return this.map(mean(this.values));
  }

  get outlier() {
    if (this._outlier) {
      return this._outlier;
    }
    const q1 = quantile(this.sorted, 0.25);
    const q3 = quantile(this.sorted, 0.75);
    const iqr = q3 - q1;
    const left = q1 - 1.5 * iqr;
    const right = q3 + 1.5 * iqr;
    this._outlier = this.sorted.filter((v) => (v < left || v > right) && !isMissingValue(v));
    if (this.scale) {
      this._outlier = this._outlier.map((v) => this.scale!.apply(v));
    }
    return this._outlier;

  }
}

export interface INumbersColumn extends INumberColumn {
  getNumbers(row: any, index: number): number[];

  getRawNumbers(row: any, index: number): number[];

  getDataLength(): number;

  getColorRange(): string[];
  getRawColorScale(): (v: number) => string;

  getThreshold(): number;

  getMapping(): IMappingFunction;
}

export function isNumbersColumn(col: any): col is INumbersColumn {
  return (<INumbersColumn>col).getNumbers !== undefined && isNumberColumn(col);
}


export interface INumbersDesc {
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
  readonly threshold?: number;
  readonly dataLength: number;
  readonly colorRange?: string[];
}


export declare type INumbersColumnDesc = INumbersDesc & IValueColumnDesc<number[]>;

export interface ISplicer {
  length: number;
  splice(values: number[]): number[];
}

export default class NumbersColumn extends ValueColumn<number[]> implements IAdvancedBoxPlotColumn, INumbersColumn, IMapAbleColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;
  static readonly EVENT_SPLICE_CHANGED = 'spliceChanged';

  private sort: SortMethod;
  private readonly threshold: number;
  private readonly dataLength: number;
  private readonly colorRange: string[];

  private mapping: IMappingFunction;

  private original: IMappingFunction;

  private splicer: ISplicer;
  /**
   * currently active filter
   * @type {{min: number, max: number}}
   * @private
   */
  private currentFilter: INumberFilter = noNumberFilter();

  static readonly DEFAULT_FORMATTER = format('.3n');

  constructor(id: string, desc: INumbersColumnDesc) {
    super(id, desc);
    if (desc.map) {
      this.mapping = createMappingFunction(desc.map);
    } else if (desc.domain) {
      this.mapping = new ScaleMappingFunction(desc.domain, 'linear', desc.range || [0, 1]);
    }
    this.original = this.mapping.clone();

    this.dataLength = desc.dataLength;
    this.threshold = desc.threshold || 0;
    this.colorRange = desc.colorRange || ['blue', 'red'];
    this.sort = desc.sort || SORT_METHOD.median;

    this.setRendererList([
      {type: 'numbers', label: 'Heatmap'},
      {type: 'boxplot', label: 'Box Plot'},
      {type: 'sparkline', label: 'Sparkline'},
      {type: 'verticalbar', label: 'Bar Chart'}], [
      {type: 'numbers', label: 'Heatmap'},
      {type: 'sparkline', label: 'Sparkline'},
      {type: 'boxplot', label: 'Box Plot'}
    ]);

    // better initialize the default with based on the data length
    this.setWidth(Math.min(Math.max(100, this.dataLength * 10), 500));

    this.splicer = {
      length: this.dataLength,
      splice: (v) => v
    };
  }

  setSplicer(splicer: ISplicer) {
    this.fire([NumbersColumn.EVENT_SPLICE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY], this.splicer, this.splicer = splicer);
  }

  getSplicer() {
    return this.splicer;
  }

  compare(a: any, b: any, aIndex: number, bIndex: number): number {
    return compareBoxPlot(this, a, b, aIndex, bIndex);
  }

  getColorRange() {
    return this.colorRange.slice();
  }

  getRawColorScale() {
    const colorScale = d3scale.linear<string, string>();
    const domain = this.mapping.domain;
    if (domain[0] < 0) {
      colorScale
        .domain([domain[0], 0, domain[1]])
        .range([this.colorRange[0], (this.colorRange.length > 2 ? this.colorRange[1] : 'white'), this.colorRange[this.colorRange.length - 1]]);

    } else {
      colorScale
        .domain([domain[0], domain[1]])
        .range([this.colorRange[0], this.colorRange[this.colorRange.length - 1]]);
    }
    return colorScale;
  }

  getRawNumbers(row: any, index: number) {
    return this.getRawValue(row, index);
  }

  getDataLength() {
    if (this.splicer) {
      return this.splicer.length;
    }
    return this.dataLength;
  }

  getThreshold() {
    return this.threshold;
  }

  getBoxPlotData(row: any, index: number) {
    const data = this.getRawValue(row, index);
    if (data === null) {
      return null;
    }
    return new LazyBoxPlotData(data, this.mapping);
  }

  getRange() {
    return this.mapping.getRange(NumbersColumn.DEFAULT_FORMATTER);
  }

  getRawBoxPlotData(row: any, index: number) {
    const data = this.getRawValue(row, index);
    if (data === null) {
      return null;
    }
    return new LazyBoxPlotData(data);
  }

  getNumbers(row: any, index: number) {
    return this.getValue(row, index);
  }

  getNumber(row: any, index: number): number {
    return getBoxPlotNumber(this, row, index, 'normalized');
  }

  getRawNumber(row: any, index: number): number {
    return getBoxPlotNumber(this, row, index, 'raw');
  }

  getValue(row: any, index: number) {
    const values = this.getRawValue(row, index);
    return values.map((d) => this.mapping.apply(d));
  }

  getRawValue(row: any, index: number) {
    let r = super.getValue(row, index);
    if (this.splicer && r !== null) {
      r = this.splicer.splice(r);
    }
    return r === null ? [] : r;
  }

  getLabel(row: any, index: number): string {
    const v = this.getRawValue(row, index);
    if (v === null) {
      return '';
    }
    return `[${v.map(NumbersColumn.DEFAULT_FORMATTER).join(', ')}]`;
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
    r.filter = this.currentFilter;
    r.map = this.mapping.dump();
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
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
    return super.createEventList().concat([NumbersColumn.EVENT_MAPPING_CHANGED, NumbersColumn.EVENT_SPLICE_CHANGED]);
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
    this.fire([NumbersColumn.EVENT_MAPPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.mapping.clone(), this.mapping = mapping);
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

