/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import Column, {IColumnDesc, IStatistics} from './Column';
import ValueColumn from './ValueColumn';
import {IValueColumnDesc} from './ValueColumn';


export interface ISetColumn {
  isLoaded(): boolean;
  getNumber(row: any, index: number): number[];
}
interface ISetColumnDesc extends IValueColumnDesc < number[]> {

  readonly dataLength?: number;

}


export default class SetColumn extends ValueColumn<number[]> implements ISetColumn {
  private dataLength;
  public static readonly IN_GROUP = 1;

  constructor(id: string, desc: ISetColumnDesc) {
    super(id, desc);
    this.dataLength = (desc.dataLength);

  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {

    const aVal = this.getValue(a, aIndex);
    const bVal = this.getValue(b, bIndex);
    if (aVal === null || bVal === null) {
      return;
    }
    const aCat = aVal.filter((x)=> x === SetColumn.IN_GROUP).length;
    const bCat = bVal.filter((x)=> x === SetColumn.IN_GROUP).length;
    return (aCat - bCat);

  }


  cellDimension() {

    return (this.getWidth() / this.dataLength);
  }


  getNumber(row: any, index: number) {
    return this.getValue(row, index);
  }

  getConstantValue() {
    return SetColumn.IN_GROUP;

  }


}
