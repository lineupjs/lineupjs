import Column from './Column';
import {IColumnDesc, IDataRow} from './interfaces';
import {isNumberIncluded, INumberFilter} from './INumberColumn';

export {INumberFilter as IDateFilter, restoreNumberFilter as restoreDateFilter,
  noNumberFilter as noDateFilter, isEqualNumberFilter as isEqualDateFilter,
  isDummyNumberFilter as isDummyDateFilter} from './INumberColumn';

export interface IDateColumn extends Column {
  getDate(row: IDataRow): Date | null;
}

export default IDateColumn;


export interface IDateDesc {
  /**
   * d3 formatting option
   * @default %x
   */
  dateFormat?: string;

  /**
   * d3 formation option
   * @dfeault dateFormat
   */
  dateParse?: string;
}


/**
 * checks whether the given column or description is a date column, i.e. the value is a date
 * @param col
 * @returns {boolean}
 */
export function isDateColumn(col: Column): col is IDateColumn;
export function isDateColumn(col: IColumnDesc): col is IDateDesc & IColumnDesc;
export function isDateColumn(col: Column | IColumnDesc) {
  return (col instanceof Column && typeof (<IDateColumn>col).getDate === 'function' || (!(col instanceof Column) && (<IColumnDesc>col).type.startsWith('date')));
}

export function isDateIncluded(filter: INumberFilter | null, value: Date | null) {
  if (!filter) {
    return true;
  }
  if (value == null || !(value instanceof Date)) {
    return !filter.filterMissing;
  }
  return isNumberIncluded(filter, value!.getTime());
}

export interface IDateGrouper {
  /**
   * granuality level for the grouping
   */
  granularity: 'decade' | 'year' | 'month' | 'week' | 'weekday' | 'day' | 'hour' | 'minute' | 'second';
  /**
   * e.g. group every 5 years together
   */
  every: number;
  /**
   * whether circular occurrences should be in the same bin
   * e.g. granularity = month
   * circular: 01.2018 == 01.2017
   * not circular: 01.2018 != 01.2017
   */
  circular: boolean;
}
