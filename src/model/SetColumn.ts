/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import Column, {IColumnDesc, IStatistics} from './Column';
import ValueColumn from './ValueColumn';
import {IValueColumnDesc} from "./ValueColumn";


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

    const a_val = this.getValue(a, aIndex);
    const b_val = this.getValue(b, bIndex);
    if (a_val === null || b_val === null) {
      return;
    }
    const a_cat = a_val.filter((x)=> x === SetColumn.IN_GROUP).length;
    const b_cat = b_val.filter((x)=> x === SetColumn.IN_GROUP).length;
    return (a_cat - b_cat);

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
