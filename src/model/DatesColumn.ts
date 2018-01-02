/**
 * Created by sam on 04.11.2016.
 */

import {timeFormat, timeParse} from 'd3-time-format';
import {median, min, max} from 'd3-array';
import {toolbar} from './annotations';
import {default as ArrayColumn, IArrayColumnDesc} from './ArrayColumn';
import Column from './Column';
import {IDateDesc} from './DateColumn';
import {IDataRow} from './interfaces';
import {FIRST_IS_NAN, isMissingValue} from './missing';

export declare type DateSort = 'min'|'max'|'median';

export interface IDatesDesc extends IDateDesc {
  readonly sort?: DateSort;
}

export declare type IDatesColumnDesc = IDatesDesc & IArrayColumnDesc<Date>;


@toolbar('datesSort')
export default class DatesColumn extends ArrayColumn<Date|null> {
  private readonly format: (date: Date) => string;
  private readonly parse: (date: string) => Date | null;
  private sort: DateSort;

  constructor(id: string, desc: IDatesColumnDesc) {
    super(id, desc);
    this.format = timeFormat(desc.dateFormat || '%x');
    this.parse = desc.dateParse ? timeParse(desc.dateParse) : timeParse(desc.dateFormat || '%x');
    this.sort = desc.sort || 'median';
    this.setDefaultRenderer('default');
  }

  getValue(row: IDataRow): (Date | null)[] {
    return super.getValue(row).map((v) => {
      if (isMissingValue(v)) {
        return null;
      }
      if (v instanceof Date) {
        return v;
      }
      return this.parse(String(v));
    });
  }

  getLabels(row: IDataRow) {
    return this.getValue(row).map((v) => (v instanceof Date) ? this.format(v) : '');
  }

  getSortMethod() {
    return this.sort;
  }

  setSortMethod(sort: DateSort) {
    if (this.sort === sort) {
      return;
    }
    this.fire([Column.EVENT_SORTMETHOD_CHANGED], this.sort, this.sort = sort);
    // sort by me if not already sorted by me
    if (!this.isSortedByMe().asc) {
      this.sortByMe();
    }
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.sortMethod = this.getSortMethod();
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (dump.sortMethod) {
      this.sort = dump.sortMethod;
    }
  }

  compare(a: IDataRow, b: IDataRow) {
    const av = <Date[]>this.getValue(a).filter(Boolean);
    const bv = <Date[]>this.getValue(b).filter(Boolean);
    if (av === bv) {
      return 0;
    }
    if (av.length === 0) {
      return bv.length === 0 ? 0 : FIRST_IS_NAN;
    }
    if (bv.length === 0) {
      return - FIRST_IS_NAN;
    }
    const as = compute(av, this.sort);
    const bs = compute(bv, this.sort);
    return as - bs;
  }
}

function compute(arr: Date[], sort: DateSort) {
  switch(sort) {
    case 'min': return min(arr, (d) => d.getTime())!;
    case 'max': return max(arr, (d) => d.getTime())!;
    case 'median': return median(arr, (d) => d.getTime())!;
  }
}
