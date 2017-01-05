/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import ValueColumn from './ValueColumn';
import Column from './Column';
import {IValueColumnDesc} from './ValueColumn';
import {numSort} from './MultiValueColumn';

export enum Sort {

  min, max, median, q1, q3, mean
}


export interface IBoxPlotColumn {
  getBoxPlotData(row: any, index: number): IBoxPlotData;
  getDomain(): number[];
  getSortMethod(): string;
  setSortMethod(sortCriteria: string): void;

}


export interface IBoxPlotColumnDesc extends IValueColumnDesc < IBoxPlotData > {

  readonly domain?: number [];
  readonly sort?: string;
  readonly colorRange?: string[];

}

export  interface IBoxPlotData {

  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
}


export default class BoxPlotColumn extends ValueColumn< IBoxPlotData > implements IBoxPlotColumn {

  private domain;
  private sort;
  private colorRange;
  private sortMethodChanged: string;
  // protected boxPlotScale: d3.scale.Linear<number,number> = d3.scale.linear();  For targid only


  constructor(id: string, desc: IBoxPlotColumnDesc) {
    super(id, desc);
    this.domain = d3.extent(desc.domain) || [1, 100];
    this.sort = desc.sort || 'min';
    this.colorRange = desc.colorRange || ['blue', 'red'];
    this.sortMethodChanged = this.sort;

  }

  /*
   // Only For Targid
   // public setDomain(domain: number[]) {
   //   const bak = this.boxPlotScale.domain();
   //   this.min = domain[0];
   //   this.max = domain[1];
   //   console.log(domain);
   //   this.boxPlotScale.domain(domain);
   //   this.fire([Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, domain);
   // }
   */

  compare(a: any, b: any, aIndex: number, bIndex: number): number {

    const aVal = (this.getValue(a, aIndex));
    const bVal = (this.getValue(b, bIndex));
    if (aVal === null || bVal === null) {
      return -1;
    }
    return (numSort(aVal[this.sortMethodChanged], (bVal[this.sortMethodChanged])));

  }

  getDomain() {
    return this.domain;
  }

  getBoxPlotData(row: any, index: number): IBoxPlotData {
    const data = this.getValue(row, index);

    if (data === null) {
      return null;
    }
    const boxdata: IBoxPlotData = {
      min: (data.min),
      median: (data.median),
      q1: (data.q1),
      q3: (data.q3),
      max: (data.max)
    };

    return boxdata;
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

