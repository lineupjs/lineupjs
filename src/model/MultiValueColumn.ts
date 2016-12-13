/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import Column  from './Column';
import ValueColumn from './ValueColumn';
import any = jasmine.any;


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

// function getPercentile(data, percentile) {
//
//       var index = (percentile / 100) * data.length;
//       var result;
//       if (Math.floor(index) === index) {
//         result = (data[(index - 1)] + data[index]) / 2;
//       } else {
//         result = data[Math.floor(index)];
//       }
//       return result;
//     }

function numSort(a, b) {
  return a - b;
}


export default class MultiValueColumn extends ValueColumn<number[] > {
  private sortBy;
  private colorrange;
  private min;
  private max;
  private bins;
  private threshold;
  private rowheight;
  private ypositionVerticalBar;
  private colorScale: d3.scale.Linear<number, string> = d3.scale.linear<number, string>();
  private xposScale: d3.scale.Linear<number, number> = d3.scale.linear();
  private yposScale: d3.scale.Linear<number, number> = d3.scale.linear();
  private verticalBarScale: d3.scale.Linear<number,number> = d3.scale.linear();
  private boxPlotScale: d3.scale.Linear<number,number> = d3.scale.linear();


  constructor(id: string, desc: any) {
    super(id, desc);
    this.colorrange = (<any>desc).colorrange || ['blue', 'red'];
    this.min = d3.min((<any>desc).domain);
    this.max = d3.max((<any>desc).domain);
    this.bins = (<any>desc).datalength;
    this.threshold = (<any>desc).threshold || 0;
    this.rowheight = 13;
    this.sortBy = (<any>desc.sort) || 'min';
    this.rendererList = [{type: 'heatmapcustom', label: 'Heatmap'},
                        {type: 'boxplot', label: 'Boxplot'},
                        {type: 'sparkline', label: 'Sparkline'},
                        {type: 'threshold', label: 'Threshold'},
                        {type: 'verticalbar', label: 'VerticalBar'}];

    this.defineColor();
    this.xScale();
    this.yScale();
    this.verticalBarHeight();
    this.boxPlotWidth();

  }

  private defineColor() {

    if (this.min < 0) {
      this.colorScale
        .domain([this.min, 0, this.max])
        .range([this.colorrange[0], 'white', this.colorrange[1]]);

    } else {
      this.colorScale
        .domain([this.min, this.max])
        .range(['white', this.colorrange[1]]);
    }
  }

  private xScale() {
    this.xposScale
      .domain([0, this.bins - 1])
      .range([0, this.getWidth()]);
  }


  private yScale() {
    this.yposScale
      .domain([this.min, this.max])
      .range([this.rowheight, 0])
  }


  private verticalBarHeight() {
    if (this.min < 0) {
      this.verticalBarScale
        .domain([this.min, this.max])
        .range([0, this.rowheight / 2])
    } else {
      this.verticalBarScale
        .domain([this.min, this.max])
        .range([0, this.rowheight])
    }

  }

  private boxPlotWidth() {
    this.boxPlotScale
      .domain([this.min, this.max])
      .range([0, this.getWidth()])


  }


  compare(a: any, b: any, aIndex: number, bIndex: number) {
    this.sortBy = this.getUserSortBy();
    const a_val = this.getValue(a, aIndex);
    const b_val = this.getValue(b, bIndex);
    const sort: any = new CustomSortCalculation(a_val, b_val);
    const f = sort[this.sortBy].bind(sort);

    return f();
  }


  getLabel(row: any, index: number) {
    return '' + this.getValue(row, index);
  }

  getRaw(row: any, index: number) {
    return this.accessor(row, index, this.id, this.desc, this.findMyRanker());
  }

  getValue(row: any, index: number) {
    var v = this.getRaw(row, index);
    // console.log(v)
    return (v);
  }

  getColor(data: any) {

    return this.colorScale(data);
  }

  calculateCellDimension() {

    return (this.getWidth() / this.bins);
  }

  getxScale(data) {

    return this.xposScale(data);
  }

  getyScale(data) {
    return this.yposScale(data);
  }


  getbinaryColor() {

    return this.colorrange;
  }

  getthresholdValue() {

    return this.threshold;
  }

  getVerticalBarHeight(data) {

    if (data < this.threshold) {
      (this.rowheight / 2 - this.verticalBarScale(data));
    } else {

      this.verticalBarScale(data);
    }

    return this.verticalBarScale(data);

  }

  getyposVerticalBar(data) {

    if (this.min < 0) {
      this.ypositionVerticalBar = (data < this.threshold) ? (this.rowheight / 2) : this.rowheight / 2 - this.getVerticalBarHeight(data);   // For positive and negative value
    } else {
      this.ypositionVerticalBar = this.rowheight - this.getVerticalBarHeight(data);
    }

    return this.ypositionVerticalBar;
  }

  getboxPlotData(data) {

    const minval_arr = Math.min.apply(Math, data);
    const maxval_arr = Math.max.apply(Math, data);

    data.sort(numSort);
    const q1 = this.boxPlotScale(d3.quantile(data, 0.25));
    const median = this.boxPlotScale(d3.quantile(data, 0.50));
    const q3 = this.boxPlotScale(d3.quantile(data, 0.75));
    const min_val = this.boxPlotScale(minval_arr);
    const max_val = this.boxPlotScale(maxval_arr);
    const boxdata = {min: min_val, median: median, q1: q1, q3: q3, max: max_val};

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

    return this.rendererList;
  }


}

