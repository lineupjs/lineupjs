/**
 * Created by bikramkawan on 24/11/2016.
 */
import {median, quantile, mean, scale as d3scale, ascending, format} from 'd3';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import Column from './Column';
import {
  IBoxPlotColumn, IBoxPlotData, SORT_METHOD as BASE_SORT_METHOD, SortMethod, compareBoxPlot
} from './BoxPlotColumn';
import {merge} from '../utils';


export const SORT_METHOD = merge({
  mean: 'mean'
}, BASE_SORT_METHOD);

export interface IAdvancedBoxPlotData extends IBoxPlotData {
  readonly mean: number;
}


export interface IAdvancedBoxPlotColumn extends IBoxPlotColumn {
  getBoxPlotData(row: any, index: number): IAdvancedBoxPlotData;
}

/**
 * helper class to lazily compute box plotdata out of a given number array
 */
class LazyBoxPlotData implements IAdvancedBoxPlotData {
  private _sorted: number[] = null;

  constructor(private readonly values: number[]) {
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


  get min() {
    return Math.min(...this.values);
  }

  get max() {
    return Math.max(...this.values);
  }

  get median() {
    return median(this.sorted);
  }

  get q1() {
    return quantile(this.sorted, 0.25);
  }

  get q3() {
    return quantile(this.sorted, 0.75);
  }

  get mean() {
    return mean(this.values);
  }
}

export interface IMultiValueColumn {
  getNumber(row: any, index: number): number[];
}

export interface IMultiValueColumnDesc extends IValueColumnDesc<number[]> {
  readonly domain?: number[];
  readonly sort?: string;
  readonly threshold?: number;
  readonly dataLength: number;
  readonly colorRange?: string[];
}


export default class MultiValueColumn extends ValueColumn<number[]> implements IAdvancedBoxPlotColumn, IMultiValueColumn {
  private readonly domain;
  private sort: SortMethod;
  private readonly threshold;
  private readonly dataLength;
  private readonly colorRange;

  private static readonly DEFAULT_FORMATTER = format('.3n');

  constructor(id: string, desc: IMultiValueColumnDesc) {
    super(id, desc);
    this.domain = desc.domain || [0, 100];
    this.dataLength = desc.dataLength;
    this.threshold = desc.threshold || 0;
    this.colorRange = desc.colorRange || ['blue', 'red'];
    this.sort = desc.sort || SORT_METHOD.min;

    const rendererList = [{type: 'multiValue', label: 'Heatmap'},
      {type: 'boxplot', label: 'Boxplot'},
      {type: 'sparkline', label: 'Sparkline'},
      {type: 'threshold', label: 'Threshold'},
      {type: 'verticalbar', label: 'VerticalBar'}];

    this.setRendererList(rendererList);

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

  getColorScale() {
    const colorScale = d3scale.linear<string, number>();
    const colorValues = this.getColorValues();
    if (this.domain[0] < 0) {
      colorScale
        .domain([this.domain[0], 0, this.domain[1]])
        .range(colorValues);

    } else {
      colorScale
        .domain([this.domain[0], this.domain[1]])
        .range(colorValues);
    }
    return colorScale;
  }

  getNumber(row: any, index: number) {
    return this.getValue(row, index);
  }

  calculateCellDimension(width: number) {
    return (width / this.dataLength);
  }

  getSparklineScale() {
    const xposScale = d3scale.linear();
    const yposScale = d3scale.linear();
    return {
      xScale: xposScale.domain([0, this.dataLength - 1]),
      yScale: yposScale.domain(this.domain)
    };
  }


  getDomain() {
    return this.domain;
  }

  getThreshold() {
    return this.threshold;
  }

  getVerticalBarScale() {
    return d3scale.linear().domain(this.domain);
  }

  getBoxPlotData(row: any, index: number): IAdvancedBoxPlotData {
    const data = this.getValue(row, index);
    if (data === null) {
      return null;
    }
    //console.log(data)
    return new LazyBoxPlotData(data);
  }

  getLabel(row: any, index: number): string {
    const v = this.getValue(row, index);
    if (v === null) {
      return '';
    }
    return `[${v.map(MultiValueColumn.DEFAULT_FORMATTER).join(', ')}]`;
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
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column) {
    super.restore(dump, factory);
    if (dump.sortMethod) {
      this.sort = dump.sortMethod;
    }
  }
}

