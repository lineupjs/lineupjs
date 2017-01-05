/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import ValueColumn from './ValueColumn';
import Column from './Column';
import {IBoxPlotColumn, IBoxPlotData, Sort, default as BoxPlotColumn} from './BoxPlotColumn';
import {IValueColumnDesc} from './ValueColumn';


export class CustomSortCalculation {
  private readonly aVal: number[];
  private readonly bVal: number[];

  constructor(aVal: number[], bVal: number[]) {
    this.bVal = bVal;
    this.aVal = aVal;
  }

  sum() {
    return (d3.sum(this.aVal) - d3.sum(this.bVal));
  }

  min() {
    return (d3.min(this.aVal) - d3.min(this.bVal));
  }

  max() {
    return (d3.max(this.aVal) - d3.max(this.bVal));
  }

  mean() {
    return (d3.mean(this.aVal) - d3.mean(this.bVal));
  }

  median() {
    return (d3.median(this.aVal.sort(numSort))) - (d3.median(this.bVal.sort(numSort)));
  }

  q1() {
    return (d3.quantile(this.aVal, 0.25)) - (d3.quantile(this.bVal, 0.25));
  }

  q3() {
    return (d3.quantile(this.aVal.sort(numSort), 0.75)) - (d3.quantile(this.bVal.sort(numSort), 0.75));
  }

}


export function numSort(a, b) {

  return a - b;
}

export interface IMultiValueColumn {
  isLoaded(): boolean;
  getNumber(row: any, index: number): number[];
}

export interface IMultiValueColumnDesc extends IValueColumnDesc <number[]> {

  readonly domain?: number [];
  readonly sort?: string;
  readonly threshold?: number;
  readonly dataLength?: number;
  readonly colorRange?: any;

}


// interface IMultiValueColumnDesc extends IDataStat {
//
//   readonly threshold: number,
//   readonly dataLength: number,
//   readonly colorRange: any
// }


export default class MultiValueColumn extends ValueColumn<number[]> implements IBoxPlotColumn,IMultiValueColumn {

  private domain;
  private sort;
  private threshold;
  private dataLength;
  private colorRange;
  private sortMethodChanged;

  private colorScale: d3.scale.Linear<number, string> = d3.scale.linear<number, string>();
  private xposScale: d3.scale.Linear<number, number> = d3.scale.linear();
  private yposScale: d3.scale.Linear<number, number> = d3.scale.linear();
  private verticalBarScale: d3.scale.Linear<number,number> = d3.scale.linear();


  constructor(id: string, desc: IMultiValueColumnDesc) {
    super(id, desc);
    this.domain = d3.extent(desc.domain);
    this.dataLength = desc.dataLength;
    this.threshold = desc.threshold || 0;
    this.colorRange = desc.colorRange || ['blue', 'red'];
    this.sort = desc.sort || Sort[Sort.min];

    this.sortMethodChanged = this.sort;

    const rendererList = [{type: 'multiValueHeatmap', label: 'Heatmap'},
      {type: 'boxplot', label: 'Boxplot'},
      {type: 'sparkline', label: 'Sparkline'},
      {type: 'threshold', label: 'Threshold'},
      {type: 'verticalbar', label: 'VerticalBar'}];

    this.setRendererList(rendererList);

    //  this.defineColorRange();

  }


  getColorValues(): string[] {
    if (this.colorRange.length > 2) {
      const minColor = this.colorRange[0];
      const zeroColor = this.colorRange[1];
      const maxColor = this.colorRange[2];
      const colorRange = [minColor, zeroColor, maxColor];
      return colorRange;

    } else {
      const minColor = this.colorRange[0];
      const zeroColor = 'white';
      const maxColor = this.colorRange[1];
      const colorRange = [minColor, zeroColor, maxColor];
      return colorRange;
    }
  }

  //
  // private defineColorRange() {
  //
  // }


  compare(a: any, b: any, aIndex: number, bIndex: number) {

    const aVal = (this.getValue(a, aIndex));
    const bVal = (this.getValue(b, bIndex));

    if (aVal === null || bVal === null) {
      return -1;
    }

    const sort: any = new CustomSortCalculation(aVal, bVal);
    const f = sort[this.sortMethodChanged].bind(sort);
    return f();

  }

  getColorScale() {
    const colorValues: any = this.getColorValues();
    if (this.domain[0] < 0) {
      this.colorScale
        .domain([this.domain[0], 0, this.domain[1]])
        .range(colorValues);

    } else {
      this.colorScale
        .domain([this.domain[0], this.domain[1]])
        .range(colorValues);
    }
    return this.colorScale;
  }

  getNumber(row: any, index: number) {
    return this.getValue(row, index);
  }

  calculateCellDimension(width: number) {

    return (width * 1 / this.dataLength);
  }

  getSparklineScale() {

    const sparklineScale = {
      xScale: this.xposScale.domain([0, this.dataLength - 1]),
      yScale: this.yposScale.domain(this.domain)
    };

    return sparklineScale;
  }


  getDomain(): number[] {
    return this.domain;
  }

  getThreshold(): number {
    return this.threshold;
  }

  getVerticalBarScale() {

    const vScale = this.verticalBarScale.domain(this.domain);
    return vScale;
  }


  getBoxPlotData(row: any, index: number): IBoxPlotData {
    const data = this.getValue(row, index);
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const sorteddata = data.slice().sort(numSort);

    const boxdata: IBoxPlotData = {
      min: (minVal),
      median: (d3.quantile(sorteddata, 0.50)),
      q1: (d3.quantile(sorteddata, 0.25)),
      q3: (d3.quantile(sorteddata, 0.75)),
      max: (maxVal)
    };
    return (boxdata);
  }

  getSortMethod() {
    return this.sortMethodChanged;
  }

  setSortMethod(sort: string) {
    this.sortMethodChanged = sort;
    const bak = this.sortByMe();
    this.fire([Column.EVENT_SORTMETHOD_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.sortByMe());

  }

}

