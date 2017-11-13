/**
 * Created by sam on 04.11.2016.
 */

import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import {FIRST_IS_NAN, isMissingValue} from './missing';
import {time} from 'd3';

export interface IDateDesc {
  /**
   * d3 formatting option
   * @default %x
   */
  readonly dateFormat?: string;

  /**
   * d3 formation option
   * @dfeault dateFormat
   */
  readonly dateParse?: string;
}

export declare type IDateColumnDesc = IValueColumnDesc<Date|string> & IDateDesc;

export default class DateColumn extends ValueColumn<Date|string> {
  private readonly format: time.Format;
  private readonly parse: (date: string)=>Date;

  constructor(id: string, desc: IDateColumnDesc) {
    super(id, desc);
    this.format = time.format(desc.dateFormat || '%x');
    this.parse = desc.dateParse ? time.format(desc.dateParse).parse : this.format.parse;
    this.setDefaultRenderer('default');
  }

  getValue(row: any, index: number): Date|null {
    const v = super.getValue(row, index);
    if (isMissingValue(v)) {
      return null;
    }
    if (v instanceof Date) {
      return v;
    }
    return this.parse(String(v));
  }

  getLabel(row: any, index: number) {
    const v = this.getValue(row, index);
    if (!(v instanceof Date)) {
      return '';
    }
    return this.format(v);
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    const av = this.getValue(a, aIndex);
    const bv = this.getValue(b, bIndex);
    if (av === bv) {
      return 0;
    }
    if (!(av instanceof Date)) {
      return (bv instanceof Date) ? FIRST_IS_NAN : 0;
    }
    if (!(bv instanceof Date)) {
      return FIRST_IS_NAN * -1;
    }
    return av.getTime() - bv.getTime();
  }
}
