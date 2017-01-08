/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import Column, {IColumnDesc, IStatistics} from './Column';
import ValueColumn from './ValueColumn';
import {IValueColumnDesc} from './ValueColumn';


interface ISetColumnDesc extends IValueColumnDesc <number[]> {
  readonly dataLength?: number;

}


export default class SetColumn extends ValueColumn<number[]> {
  static readonly IN_GROUP = 1;

  private readonly dataLength;

  constructor(id: string, desc: ISetColumnDesc) {
    super(id, desc);
    this.dataLength = (desc.dataLength);

  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {

    const aVal = this.getBinaryValue(a, aIndex);
    const bVal = this.getBinaryValue(b, bIndex);
    if (aVal === null) {
      return bVal === null ? 0 : +1;
    }
    if (bVal === null) {
      return -1;
    }

    const aCat = aVal.filter((x) => x).length;
    const bCat = bVal.filter((x) => x).length;
    return (aCat - bCat);
  }


  cellDimension() {
    return (this.getWidth() / this.dataLength);
  }

  getBinaryValue(row: any, index: number): boolean[] {
    return this.getValue(row, index).map((d) => d === SetColumn.IN_GROUP);
  }

  getNumber(row: any, index: number) {
    return this.getValue(row, index);
  }

}
