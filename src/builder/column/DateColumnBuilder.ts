import {IDateColumnDesc} from '../../model';
import ColumnBuilder from './ColumnBuilder';

export default class DateColumnBuilder extends ColumnBuilder<IDateColumnDesc> {

  constructor(column: string) {
    super('date', column);
  }

  /**
   * specify the format and parsing d3-time pattern to convert Date to strings and vise versa
   * @param {string} format d3-time-format pattern
   * @param {string} parse optional different parsing pattern
   */
  format(format: string, parse?: string) {
    this.desc.dateFormat = format;
    if (parse) {
      this.desc.dateParse = parse;
    }
    return this;
  }

}

/**
 * builds a date column builder
 * @param {string} column column which contains the associated data
 * @returns {DateColumnBuilder}
 */
export function buildDateColumn(column: string) {
  return new DateColumnBuilder(column);
}
