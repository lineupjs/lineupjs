/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import ValueColumn from './ValueColumn';
import Column from './Column';
import {IDataStat} from './MultiValueColumn';


function numSort(a, b) {

  return a - b;
}

enum Sort {

  min, max, median, q1, q3, mean
}

export interface IBoxPlotColumn {
  getBoxPlotData(row: any, index: number, scale: any): IBoxPlotData;
  getDataInfo(): IDataStat;
  getUserSortBy(): string;

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

  // Only For Targid
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
    return this.userSort;
  }


  setUserSortBy(rank: string) {
    this.userSort = rank;
   // this.data.sort = rank;  // Only for Targid for highlighting
    var sortAscending = {};
    sortAscending[Sort[Sort.min]] = true;
    sortAscending[Sort[Sort.max]] = false;
    sortAscending[Sort[Sort.mean]] = true;
    sortAscending[Sort[Sort.median]] = false;
    sortAscending[Sort[Sort.q1]] = true;
    sortAscending[Sort[Sort.q3]] = false;

    let ascending = sortAscending[this.userSort];

    this.sortByMe(ascending);

  }


}

