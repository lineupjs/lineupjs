/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import ValueColumn from './ValueColumn';
import Column from './Column';
import {IValueColumnDesc} from "./ValueColumn";
import {numSort} from './MultiValueColumn';

export enum Sort {

  min, max, median, q1, q3, mean
}


export interface IBoxPlotColumn {
  getBoxPlotData(row: any, index: number): IBoxPlotData;
  getDataInfo(): IBoxPlotColumnDesc;
  getUserSortBy(): string;
  setUserSortBy(sortCriteria:string):void

}

/*
 This was created only for targid purpose to set the domain I

 interface IBoxPlotDataStat extends IDataStat {
 min: number,
 max: number,
 readonly sort: string

 }

 */

export interface IBoxPlotColumnDesc extends IValueColumnDesc < IBoxPlotData > {

  readonly domain?: number [];
  readonly sort?: string;
  readonly colorRange?: any;
  readonly min?: number;
  readonly max?: number;

}

export  interface IBoxPlotData {

  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
}


export default class BoxPlotColumn extends ValueColumn< IBoxPlotData > implements IBoxPlotColumn {

  private data;
  private min;
  private max;
  private sort;
  private colorRange;
  private userSort;
  protected boxPlotScale: d3.scale.Linear<number,number> = d3.scale.linear();


  constructor(id: string, desc: IBoxPlotColumnDesc) {
    super(id, desc);
    this.min = d3.min(desc.domain);
    this.max = d3.max(desc.domain);
    this.sort = desc.sort || 'min';
    this.colorRange = desc.colorRange || ['blue', 'red'];

    this.data = {
      min: this.min,
      max: this.max,
      sort: this.sort,
      colorRange: this.colorRange

    };

    this.userSort = this.sort;

  }

  /*
   // Only For Targid
   public setDomain(domain: number[]) {
   const bak = this.boxPlotScale.domain();
   this.data.min = domain[0];
   this.data.max = domain[1];
   this.boxPlotScale.domain(domain);
   this.fire([Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, domain);
   }

   */
  compare(a: any, b: any, aIndex: number, bIndex: number) {

    const a_val = (this.getValue(a, aIndex));
    const b_val = (this.getValue(b, bIndex));
    if (a_val === null || b_val === null) {
      return;
    }
    return (numSort((<any>a_val)[this.userSort], (<any>b_val)[this.userSort]));

  }

  getDataInfo() {

    return this.data;
  }

  getBoxPlotData(row: any, index: number) {
    const data = this.getValue(row, index);

    if (data === null) {
      return;
    }
    const boxdata: IBoxPlotData = {
      min: ((<any>data).min),
      median: ((<any>data).median),
      q1: ((<any>data).q1),
      q3: ((<any>data).q3),
      max: ((<any>data).max)
    };

    return boxdata;
  }

  getUserSortBy() {
    return this.userSort;
  }

  setUserSortBy(sort: string) {
    this.userSort = sort;
    this.sortByMe();
  }


}

