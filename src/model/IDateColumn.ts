import {timeFormat} from 'd3-time-format';
import Column from './Column';
import {IColumnDesc, IDataRow} from './interfaces';
import {isNumberIncluded, INumberFilter} from './INumberColumn';
import {timeDay, timeMonth, timeWeek, timeMinute, timeSecond, timeHour} from 'd3-time';
import {equal} from '../internal/utils';

/** @internal */
export {restoreNumberFilter as restoreDateFilter,
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

export declare type IDateFilter = INumberFilter;

/** @internal */
export function isDateIncluded(filter: INumberFilter | null, value: Date | null) {
  if (!filter) {
    return true;
  }
  if (value == null || !(value instanceof Date)) {
    return !filter.filterMissing;
  }
  return isNumberIncluded(filter, value!.getTime());
}

export declare type IDateGranularity = 'century' | 'decade' | 'year' | 'month' | 'week' | 'day_of_week' | 'day_of_month' | 'day_of_year' | 'hour' | 'minute' | 'second';

export interface IDateGrouper {
  /**
   * granuality level for the grouping
   */
  granularity: IDateGranularity;
  /**
   * whether circular occurrences should be in the same bin
   * e.g. granularity = month
   * circular: 01.2018 == 01.2017
   * not circular: 01.2018 != 01.2017
   */
  circular: boolean;
}

/**
 * @internal
 */
export function defaultDateGrouper(): IDateGrouper {
  return { granularity: 'month', circular: false};
}

/**
 * @internal
 */
export function isDefaultDateGrouper(grouper: IDateGrouper) {
  return equal(defaultDateGrouper(), grouper);
}

/**
 * convert the given date to the desired grouper
 * @internal
 */
export function toDateGroup(grouper: IDateGrouper, value: Date): {value: number, name: string} {
  switch(grouper.granularity) {
  case 'century':
    const centuryP = Math.floor(value.getFullYear() / 100);
    if (grouper.circular) {
      const century = centuryP % 10;
      return {
        value: century,
        name: `*${century}00`
      };
    }
    return {
      value: centuryP,
      name: `${centuryP}00`
    };
  case 'decade':
    const decadeP = Math.floor(value.getFullYear() / 10);
    if (grouper.circular) {
      const decade = decadeP % 10;
      return {
        value: decade,
        name: `**${decade}0`
      };
    }
    return {
      value: decadeP,
      name: `${decadeP}0`
    };
  case 'year':
    if (grouper.circular) {
      const year = value.getFullYear() % 10;
      return {
        value: year,
        name: `***${year}`
      };
    }
    return {
      value: value.getFullYear(),
      name: String(value.getFullYear())
    };
  case 'month':
    if (grouper.circular) {
      return {
        value: value.getMonth(),
        name: timeFormat('%B')(value)
      };
    }
    return {
      value: timeMonth(value).getTime(),
      name: timeFormat('%B %Y')(value)
    };
  case 'week':
    if (grouper.circular) {
      return {
        value: value.getMonth(),
        name: timeFormat('%B')(value) // TODO
      };
    }
    return {
      value: timeWeek(value).getTime(),
      name: timeFormat('%B %Y')(value) // TODO
    };
  case 'day_of_week':
    if (grouper.circular) {
      return {
        value: value.getDay(),
        name: timeFormat('%A')(value)
      };
    }
    return {
      value: timeDay(value).getTime(),
      name: timeFormat('%x')(value)
    };
  case 'day_of_month':
    if (grouper.circular) {
      return {
        value: value.getDate(),
        name: timeFormat('%d')(value)
      };
    }
    return {
      value: timeDay(value).getTime(),
      name: timeFormat('%x')(value)
    };
  case 'day_of_year':
    if (grouper.circular) {
      // %j = day of year
      const v = timeFormat('%j')(value);
      return {
        value: parseInt(v, 10),
        name: v
      };
    }
    return {
      value: timeDay(value).getTime(),
      name: timeFormat('%x')(value)
    };
  case 'hour':
    if (grouper.circular) {
      return {
        value: value.getHours(),
        name: timeFormat('%A')(value)
      };
    }
    return {
      value: timeHour(value).getTime(),
      name: timeFormat('%x')(value)
    };
  case 'minute':
    if (grouper.circular) {
      return {
        value: value.getMinutes(),
        name: timeFormat('%A')(value)
      };
    }
    return {
      value: timeMinute(value).getTime(),
      name: timeFormat('%x')(value)
    };
  case 'second':
    if (grouper.circular) {
      return {
        value: value.getSeconds(),
        name: timeFormat('%A')(value)
      };
    }
    return {
      value: timeSecond(value).getTime(),
      name: timeFormat('%x')(value)
    };
  }

  return {
    value: value.getTime(),
    name: value.toString()
  };
}
