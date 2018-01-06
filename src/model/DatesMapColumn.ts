import {timeFormat, timeParse} from 'd3-time-format';
import {IDateDesc} from './DateColumn';
import {IKeyValue} from './IArrayColumn';
import {IDataRow} from './interfaces';
import MapColumn, {IMapColumnDesc} from './MapColumn';
import {isMissingValue} from './missing';

export declare type IDateMapColumnDesc = IDateDesc & IMapColumnDesc<Date | null>;

/**
 * a string column with optional alignment
 */

export default class DatesMapColumn extends MapColumn<Date | null> {
  private readonly format: (date: Date) => string;
  private readonly parse: (date: string) => Date | null;

  constructor(id: string, desc: Readonly<IDateMapColumnDesc>) {
    super(id, desc);
    this.format = timeFormat(desc.dateFormat || '%x');
    this.parse = desc.dateParse ? timeParse(desc.dateParse) : timeParse(desc.dateFormat || '%x');
    this.setDefaultRenderer('default');
  }

  private parseValue(v: any) {
    if (isMissingValue(v)) {
      return null;
    }
    if (v instanceof Date) {
      return v;
    }
    return this.parse(String(v));
  }

  getValue(row: IDataRow) {
    return super.getValue(row).map(({key, value}) => ({
      key,
      value: this.parseValue(value)
    }));
  }

  getLabels(row: IDataRow): IKeyValue<string>[] {
    return this.getValue(row).map(({key, value}) => ({
      key,
      value: (value instanceof Date) ? this.format(value) : ''
    }));
  }
}
