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
    this.cellWidth = this.getWidth()|| 100;
    this.rowHeight = 13;
    this.dataInfo ={min:this.min,
                    max:this.max,
                    threshold:this.threshold,
                    sort:this.sortBy};
    this.rendererInfo.rendererList = [{type: 'heatmapcustom', label: 'Heatmap'},
      {type: 'boxplot', label: 'Boxplot'},
      {type: 'sparkline', label: 'Sparkline'},
      {type: 'threshold', label: 'Threshold'},
      {type: 'verticalbar', label: 'VerticalBar'}];

    this.defineColorRange();
    this.boxPlotWidth();

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

  private boxPlotWidth() {
    this.boxPlotScale
      .domain([this.min, this.max])
      .range([0, 1*this.getWidth()])

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


    return (width*1 / this.dataLength);
  }

  getSparkLineXScale() {
    this.xposScale
      .domain([0, this.dataLength - 1])
      .range([0, this.cellWidth]);
    return this.xposScale;
  }

  getSparkLineYScale() {
    this.yposScale
      .domain([this.min, this.max])
      .range([this.rowHeight, 0]);
    return this.yposScale;
  }

  getDataLength(){

    return this.dataLength;
  }

  getbinaryColor() {

    console.log(this.colorRange)
    return this.colorRange;
  }

  getDataInfo() {
    console.log(this.dataInfo)
    return this.dataInfo;
  }

  getVerticalBarScale ()
  {
     this.verticalBarScale
        .domain([this.min, this.max]);
    return this.verticalBarScale;
  }




  getboxPlotData(data) {

    const minval_arr = Math.min.apply(Math, data);
    const maxval_arr = Math.max.apply(Math, data);

    data.slice(0).sort(numSort);
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

    return this.rendererInfo.rendererList;
  }


}

