/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import ValueColumn from './ValueColumn';
import Column from './Column';
import {IDataStat} from './MultiValueColumn';

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

export interface IBoxPlotColumn {
  getBoxPlotData(row: any, index: number, scale: any): IBoxPlotData;
  getDataInfo(): IDataStat;

}


interface IBoxPlotDataStat extends IDataStat {
  min: number,
  max: number,
  readonly sort: string

}

export  interface IBoxPlotData {

  readonly min: number;
  readonly max: number;
  readonly median: number;
  readonly q1: number;
  readonly q3: number;
}


export default class BoxPlotColumn extends ValueColumn< IBoxPlotData > implements IBoxPlotColumn {

  private data: IBoxPlotDataStat;
  private userSort;
  protected boxPlotScale: d3.scale.Linear<number,number> = d3.scale.linear();


  constructor(id: string, desc: any) {
    super(id, desc);

    this.data = {
      min: d3.min((<any>desc).domain),
      max: d3.max((<any>desc).domain),
      sort: (<any>desc.sort) || 'min',

    };

    this.userSort = this.data.sort;

  }

  public setDomain(domain: number[]) {
    const bak = this.boxPlotScale.domain();

    this.data.min = domain[0];
    this.data.max = domain[1];
    this.boxPlotScale.domain(domain);

    this.fire([Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, domain);
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {


    const a_val = (this.getValue(a, aIndex));
    if (a_val === null) {
      return;
    }

    const b_val = (this.getValue(b, bIndex));
    const boxSort = this.userSort;

    return (numSort((<any>a_val)[boxSort], (<any>b_val)[boxSort]));

  }


  getDataInfo() {

    return this.data;
  }


  getBoxPlotData(row: any, index: number, scale: any) {
    const data = this.getValue(row, index);

    if (data === null) {
      return;
    }
    const boxdata: IBoxPlotData = {
      min: scale((<any>data).min),
      median: scale((<any>data).median),
      q1: scale((<any>data).q1),
      q3: scale((<any>data).q3),
      max: scale((<any>data).max)
    };


    return boxdata;

  }

  getUserSortBy() {
    return this.data.sort;
  }

  setUserSortBy(rank: string) {
    this.userSort = rank;
    let ascending = false;

    switch (rank) {

      case Sort[Sort.min]:
        ascending = true;
        break;
      case Sort[Sort.max]:
        ascending = false;
        break;
      case Sort[Sort.mean]:
        ascending = true;
        break;
      case Sort[Sort.median]:
        ascending = false;
        break;
      case Sort[Sort.q1]:
        ascending = true;
        break;
      case Sort[Sort.q3]:
        ascending = false;
        break;
      default:
        ascending = false;
    }
    this.sortByMe(ascending);
  }


}

