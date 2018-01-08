import {IDateColumnDesc} from '../../model';
import ColumnBuilder from './ColumnBuilder';

export default class DateColumnBuilder extends ColumnBuilder<IDateColumnDesc> {

  constructor(column: string) {
    super('date', column);
  }

  format(format: string, parse?: string) {
    this.desc.dateFormat = format;
    if (parse) {
      this.desc.dateParse = parse;
    }
    return this;
  }

}

export function buildDateColumn(column: string) {
  return new DateColumnBuilder(column);
}
