/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import ValueColumn from './ValueColumn';


export class CustomSortCalculation {

  constructor(private a_val: number[], private b_val: number []) {
    this.b_val = b_val;
    this.a_val = a_val;
  }


  sum() {
    return (d3.sum(this.a_val) - d3.sum(this.b_val));
  }

  min() {
    return (d3.min(this.a_val) - d3.min(this.b_val));

  }


  max() {
    return (d3.max(this.a_val) - d3.max(this.b_val));
  }

  mean() {

    return (d3.mean(this.a_val) - d3.mean(this.b_val));
  }

  median() {
    return (d3.median(this.a_val)) - (d3.median(this.b_val));

  }

  q1() {

    return (d3.quantile(this.a_val, 0.25)) - (d3.quantile(this.b_val, 0.25));

  }

  q3() {

    return (d3.quantile(this.a_val, 0.75)) - (d3.quantile(this.b_val, 0.75));

  }
}

function numSort(a, b) {
  return a - b;
}

enum Sort {

  min, max, median, q1, q3
}


interface boxPlotData {

  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
}

export default class MultiValueColumn extends ValueColumn<number[] > {
  private sortBy;
  private colorRange;
  private min;
  private max;
  private dataLength;
  private dataInfo;
  private cellWidth;
  private ypositionVerticalBar;
  private rowHeight;
  private threshold;
  private colorScale: d3.scale.Linear<number, string> = d3.scale.linear<number, string>();
  private xposScale: d3.scale.Linear<number, number> = d3.scale.linear();
  private yposScale: d3.scale.Linear<number, number> = d3.scale.linear();
  private verticalBarScale: d3.scale.Linear<number,number> = d3.scale.linear();
  private boxPlotScale: d3.scale.Linear<number,number> = d3.scale.linear();


  constructor(id: string, desc: any) {
    super(id, desc);
    this.colorRange = (<any>desc).colorRange || ['blue', 'red'];
    this.min = d3.min((<any>desc).domain);
    this.max = d3.max((<any>desc).domain);
    this.dataLength = (<any>desc).dataLength;
    this.threshold = (<any>desc).threshold || 0;
    this.sortBy = (<any>desc.sort) || 'min';
    this.cellWidth = this.getWidth() || 100;
    this.rowHeight = 13;
    this.dataInfo = {
      min: this.min,
      max: this.max,
      threshold: this.threshold,
      sort: this.sortBy
    };
    this.rendererInfo.rendererList = [{type: 'heatmapcustom', label: 'Heatmap'},
      {type: 'boxplot', label: 'Boxplot'},
      {type: 'sparkline', label: 'Sparkline'},
      {type: 'threshold', label: 'Threshold'},
      {type: 'verticalbar', label: 'VerticalBar'}];

    this.defineColorRange();

  }

  private defineColorRange() {

    if (this.min < 0) {
      this.colorScale
        .domain([this.min, 0, this.max])
        .range([this.colorRange[0], 'white', this.colorRange[1]]);

    } else {
      this.colorScale
        .domain([this.min, this.max])
        .range(['white', this.colorRange[1]]);
    }
  }


  compare(a: any, b: any, aIndex: number, bIndex: number) {

    const a_val = (this.getValue(a, aIndex)).sort(numSort);
    const b_val = (this.getValue(b, bIndex)).sort(numSort);
    const sort: any = new CustomSortCalculation(a_val, b_val);
    const f = sort[this.sortBy].bind(sort);

    return f();
  }

  getColor() {

    return this.colorScale;
  }

  calculateCellDimension(width) {


    return (width * 1 / this.dataLength);
  }

  getSparkLineXScale() {
    this.xposScale
      .domain([0, this.dataLength - 1]);
    return this.xposScale;
  }

  getSparkLineYScale() {
    this.yposScale
      .domain([this.min, this.max]);
    return this.yposScale;
  }

  getDataLength() {

    return this.dataLength;
  }

  getbinaryColor() {


    return this.colorRange;
  }

  getDataInfo() {

    return this.dataInfo;
  }

  getVerticalBarScale() {
    this.verticalBarScale
      .domain([this.min, this.max]);
    return this.verticalBarScale;
  }

  getboxPlotScale(width) {
    this.boxPlotScale
      .domain([this.min, this.max])
      .range([0, 1 * width])

    return this.boxPlotScale;
  }


  getboxPlotData(data, scale) {

    var boxPlotData = <boxPlotData>{};

    const minval_arr = Math.min.apply(Math, data);
    const maxval_arr = Math.max.apply(Math, data);
    let sorteddata = data.slice().sort(numSort);

    boxPlotData.q1 = scale(d3.quantile(sorteddata, 0.25));
    boxPlotData.median = scale(d3.quantile(sorteddata, 0.50));
    boxPlotData.q3 = scale(d3.quantile(sorteddata, 0.75));
    boxPlotData.min = scale(minval_arr);
    boxPlotData.max = scale(maxval_arr);

    let boxdata = {
      min: boxPlotData.min,
      median: boxPlotData.median,
      q1: boxPlotData.q1,
      q3: boxPlotData.q3,
      max: boxPlotData.max
    };

    return (boxdata);

  }

  getUserSortBy() {
    return this.sortBy;
  }

  setUserSortBy(rank) {

    let ascending = false;

    switch (rank) {
      case 'min':
        ascending = true;
        break;
      case 'max':
        ascending = false;
        break;
      case 'mean':
        ascending = true;
        break;
      case 'median':
        ascending = false;
        break;
      case 'q1':
        ascending = true;
        break;
      case 'q3':
        ascending = false;
        break;
      default:
        ascending = false;
    }

    this.sortByMe(ascending);
  }


  getRendererList() {

    return this.rendererInfo.rendererList;
  }


}

