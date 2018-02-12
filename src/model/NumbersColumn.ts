/**
 * Created by bikramkawan on 24/11/2016.
 */
import {scale as d3scale} from 'd3';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import Column from './Column';
import NumberColumn, {
  createMappingFunction,
  IMapAbleColumn,
  IMappingFunction,
  ScaleMappingFunction
} from './NumberColumn';
import {isMissingValue} from './missing';
import {
  compareBoxPlot, DEFAULT_FORMATTER, getBoxPlotNumber, IAdvancedBoxPlotColumn, INumberFilter, INumbersColumn,
  isSameFilter,
  LazyBoxPlotData,
  noNumberFilter, restoreFilter,
  SORT_METHOD,
  SortMethod
} from './INumberColumn';


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

  constructor(id: string, desc: INumbersColumnDesc) {
    super(id, desc);
    if (desc.map) {
      this.mapping = createMappingFunction(desc.map);
    } else if (desc.domain) {
      this.mapping = new ScaleMappingFunction(desc.domain, 'linear', desc.range || [0, 1]);
    }
    this.original = this.mapping.clone();

    this.dataLength = desc.dataLength || 0;
    this.threshold = desc.threshold || 0;
    this.colorRange = desc.colorRange || ['blue', 'red'];
    this.sort = desc.sort || SORT_METHOD.median;

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
    if (domain[0] < 0 && domain[1] > 0) { // diverging
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
    return this.mapping.getRange(DEFAULT_FORMATTER);
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
    return values.map((d) => isMissingValue(d) ? NaN : this.mapping.apply(d));
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
    return `[${v.map(DEFAULT_FORMATTER).join(', ')}]`;
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

