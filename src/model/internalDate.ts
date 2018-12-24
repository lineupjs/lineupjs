import {timeDay, timeHour, timeMinute, timeMonth, timeSecond, timeWeek} from 'd3-time';
import {timeFormat} from 'd3-time-format';
import {equal, ISequence, isSeqEmpty} from '../internal';
import {INumberFilter, IDateGrouper, IDataRow, IDateColumn} from '.';
import {isNumberIncluded} from './internalNumber';

/** @internal */
export {isDummyNumberFilter as isDummyDateFilter, isEqualNumberFilter as isEqualDateFilter, noNumberFilter as noDateFilter, restoreNumberFilter as restoreDateFilter} from './internalNumber';


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


/**
 * @internal
 */
export function defaultDateGrouper(): IDateGrouper {
  return {granularity: 'month', circular: false};
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
  switch (grouper.granularity) {
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
          name: timeFormat('%W')(value)
        };
      }
      return {
        value: timeWeek(value).getTime(),
        name: timeFormat('%W %Y')(value)
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


/**
 * @internal
 */
export function chooseAggregatedDate(rows: ISequence<IDataRow>, grouper: IDateGrouper | null, col: IDateColumn, valueCache?: ISequence<Date | null>): {value: number | null, name: string} {
  const vs = <ISequence<Date>>(valueCache ? valueCache : rows.map((d) => col.getDate(d))).filter((d) => d instanceof Date);
  if (isSeqEmpty(vs)) {
    return {value: null, name: ''};
  }
  const median = trueMedian(vs.map((d) => d.getTime()))!;
  if (!grouper) {
    return {value: median, name: (new Date(median)).toString()};
  }
  return toDateGroup(grouper, new Date(median));
}

function trueMedian(dates: ISequence<number>) {
  // to avoid interpolating between the centers do it manually
  const s = Float64Array.from(dates);
  if (s.length === 1) {
    return s[0];
  }

  s.sort();
  return s[Math.floor(s.length / 2)];
}
