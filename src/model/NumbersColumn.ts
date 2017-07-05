/**
 * Created by bikramkawan on 24/11/2016.
 */
import {median, quantile, mean, scale as d3scale, ascending, format} from 'd3';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import Column from './Column';
import {
  IBoxPlotColumn, IBoxPlotData, SORT_METHOD as BASE_SORT_METHOD, SortMethod, compareBoxPlot, getBoxPlotNumber
} from './BoxPlotColumn';
import {merge} from '../utils';
import NumberColumn, {INumberColumn, IMappingFunction, createMappingFunction, ScaleMappingFunction, IMapAbleColumn, INumberFilter, noNumberFilter} from './NumberColumn';


export const SORT_METHOD = merge({
  mean: 'mean'
}, BASE_SORT_METHOD);

export interface IAdvancedBoxPlotData extends IBoxPlotData {
  readonly mean: number;
}


export interface IAdvancedBoxPlotColumn extends IBoxPlotColumn {
  getBoxPlotData(row: any, index: number): IAdvancedBoxPlotData;
  getRawBoxPlotData(row: any, index: number): IAdvancedBoxPlotData;
}

/**
 * helper class to lazily compute box plotdata out of a given number array
 */
class LazyBoxPlotData implements IAdvancedBoxPlotData {
  private _sorted: number[] = null;

  constructor(private readonly values: number[], private readonly scale?: IMappingFunction) {
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
    return this.scale? this.scale.apply(v) : v;
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
}

export interface INumbersColumn extends INumberColumn {
  getNumbers(row: any, index: number): number[];
  getRawNumbers(row: any, index: number): number[];
  getDataLength(): number;
  getRawColorScale(): d3.scale.Linear<string, string>;
  getThreshold(): number;

  getMapping(): IMappingFunction;
}

export interface INumbersColumnDesc extends IValueColumnDesc<number[]> {
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


export default class NumbersColumn extends ValueColumn<number[]> implements IAdvancedBoxPlotColumn, INumbersColumn, IMapAbleColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;

  private sort: SortMethod;
  private readonly threshold;
  private readonly dataLength;
  private readonly colorRange;

  private mapping: IMappingFunction;

  private original: IMappingFunction;
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
    this.sort = desc.sort || SORT_METHOD.min;

    this.setRendererList([
      {type: 'numbers', label: 'Heatmap'},
      {type: 'boxplot', label: 'Boxplot'},
      {type: 'sparkline', label: 'Sparkline'},
      {type: 'threshold', label: 'Threshold'},
      {type: 'verticalbar', label: 'VerticalBar'},
      {type: 'number', label: 'Bar'},
      {type: 'circle', label: 'Circle'}]);

  }


  private getColorValues(): string[] {
    if (this.colorRange.length > 2) {
      return this.colorRange.slice();
    } else {
      const minColor = this.colorRange[0];
      const zeroColor = 'white';
      const maxColor = this.colorRange[1];
      return [minColor, zeroColor, maxColor];
    }
  }


  compare(a: any, b: any, aIndex: number, bIndex: number): number {
    return compareBoxPlot(this, a, b, aIndex, bIndex);
  }

  getRawColorScale() {
    const colorScale = d3scale.linear<string, string>();
    const colorValues = this.getColorValues();
    const domain = this.mapping.domain;
    if (domain[0] < 0) {
      colorScale
        .domain([domain[0], 0, domain[1]])
        .range(colorValues);

    } else {
      colorScale
        .domain([domain[0], domain[1]])
        .range(colorValues);
    }
    return colorScale;
  }

  getRawNumbers(row: any, index: number) {
    return this.getRawValue(row, index);
  }

  getDataLength() {
    return this.dataLength;
  }

  getThreshold() {
    return this.threshold;
  }

  getBoxPlotData(row: any, index: number): IAdvancedBoxPlotData {
    const data = this.getRawValue(row, index);
    if (data === null) {
      return null;
    }
    return new LazyBoxPlotData(data, this.mapping);
  }

  getRawBoxPlotData(row: any, index: number): IAdvancedBoxPlotData {
    const data = this.getRawValue(row, index);
    if (data === null) {
      return null;
    }
    return new LazyBoxPlotData(data);
  }

  getNumbers(row: any, index: number) {
    return this.getValue(row, index);
  }

  getNumber(row: any, index: number) {
    return getBoxPlotNumber(this, row, index, 'normalized');
  }

  getRawNumber(row: any, index: number) {
    return getBoxPlotNumber(this, row, index, 'raw');
  }

  getValue(row: any, index: number) {
    const values = this.getRawValue(row, index);
    return values.map((d) => this.mapping.apply(d));
  }

  getRawValue(row: any, index: number) {
    return super.getValue(row, index);
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
    return super.createEventList().concat([NumbersColumn.EVENT_MAPPING_CHANGED]);
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

