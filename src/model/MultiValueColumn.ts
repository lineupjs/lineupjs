/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import Column, {IColumnDesc} from './Column';
import ValueColumn from './ValueColumn';
import data from "../../../lineup_demos_source/src/datasets";


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

    return (d3.median(this.a_val.sort(numSort))) - (d3.median(this.b_val.sort(numSort)));

  }

  q1() {

    return (d3.quantile(this.a_val, 0.25)) - (d3.quantile(this.b_val, 0.25));

  }

  q3() {

    return (d3.quantile(this.a_val.sort(numSort), 0.75)) - (d3.quantile(this.b_val.sort(numSort), 0.75));

  }
}

function numSort(a, b) {
  return a - b;
}

enum Sort {

  min, max, median, q1, q3, mean
}


interface IBoxPlotData {

  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
}

interface IDataStat {
  min: number,
  max: number,
  sort: string,
  threshold: number,
  dataLength: number,
  colorRange: any
}


export default class MultiValueColumn extends ValueColumn<number[] > {

  private data: IDataStat;

  private colorScale: d3.scale.Linear<number, string> = d3.scale.linear<number, string>();
  private xposScale: d3.scale.Linear<number, number> = d3.scale.linear();
  private yposScale: d3.scale.Linear<number, number> = d3.scale.linear();
  private verticalBarScale: d3.scale.Linear<number,number> = d3.scale.linear();
  private boxPlotScale: d3.scale.Linear<number,number> = d3.scale.linear();


  constructor(id: string, desc: any) {
    super(id, desc);

    this.data = {
      min: d3.min((<any>desc).domain),
      max: d3.max((<any>desc).domain),
      dataLength: (<any>desc).dataLength,
      threshold: (<any>desc).threshold || 0,
      sort: (<any>desc.sort) || 'min',
      colorRange: (<any>desc).colorRange || ['blue', 'red']
    };

    this.rendererInfo.rendererList = [{type: 'heatmapcustom', label: 'Heatmap'},
      {type: 'boxplot', label: 'Boxplot'},
      {type: 'sparkline', label: 'Sparkline'},
      {type: 'threshold', label: 'Threshold'},
      {type: 'verticalbar', label: 'VerticalBar'}];

    this.defineColorRange();

  }

  private defineColorRange() {

    if (this.data.min < 0) {
      this.colorScale
        .domain([this.data.min, 0, this.data.max])
        .range([this.data.colorRange[0], 'white', this.data.colorRange[1]]);

    } else {
      this.colorScale
        .domain([this.data.min, this.data.max])
        .range(['white', this.data.colorRange[1]]);
    }
  }


  compare(a: any, b: any, aIndex: number, bIndex: number) {

    const a_val = (this.getValue(a, aIndex));
    const b_val = (this.getValue(b, bIndex));
    const sort: any = new CustomSortCalculation(a_val, b_val);
    const f = sort[this.data.sort].bind(sort);

    return f();
  }

  getColor() {

    return this.colorScale;
  }

  calculateCellDimension(width) {


    return (width * 1 / this.data.dataLength);
  }

  getSparkLineXScale() {
    this.xposScale
      .domain([0, this.data.dataLength - 1]);
    return this.xposScale;
  }

  getSparkLineYScale() {
    this.yposScale
      .domain([this.data.min, this.data.max]);
    return this.yposScale;
  }

  getDataLength() {

    return this.data.dataLength;
  }

  getbinaryColor() {


    return this.data.colorRange;
  }

  getDataInfo() {

    return this.data;
  }

  getVerticalBarScale() {
    this.verticalBarScale
      .domain([this.data.min, this.data.max]);
    return this.verticalBarScale;
  }

  getboxPlotScale(width) {
    this.boxPlotScale
      .domain([this.data.min, this.data.max])
      .range([0, 1 * width])

    return this.boxPlotScale;
  }


  getboxPlotData(data, scale) {

    var boxPlotData = <IBoxPlotData>{};

    const minval_arr = Math.min.apply(Math, data);
    const maxval_arr = Math.max.apply(Math, data);
    const sorteddata = data.slice().sort(numSort);

    boxPlotData.q1 = scale(d3.quantile(sorteddata, 0.25));
    boxPlotData.median = scale(d3.quantile(sorteddata, 0.50));
    boxPlotData.q3 = scale(d3.quantile(sorteddata, 0.75));
    boxPlotData.min = scale(minval_arr);
    boxPlotData.max = scale(maxval_arr);

    const boxdata = {
      min: boxPlotData.min,
      median: boxPlotData.median,
      q1: boxPlotData.q1,
      q3: boxPlotData.q3,
      max: boxPlotData.max
    };

    return (boxdata);

  }

  getUserSortBy() {
    return this.data.sort;
  }

  setUserSortBy(rank) {

    let ascending = false;

    switch (rank) {
      case Sort.min:
        ascending = true;
        break;
      case Sort.max:
        ascending = false;
        break;
      case Sort.mean:
        ascending = true;
        break;
      case Sort.median:
        ascending = false;
        break;
      case Sort.q1:
        ascending = true;
        break;
      case Sort.q3:
        ascending = false;
        break;
      default:
        ascending = false;
    }

    this.sortByMe(ascending);
  }

  //setRendererList(this.rendererInfo.rendererList);


}

