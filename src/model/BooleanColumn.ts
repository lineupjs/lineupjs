/**
 * Created by sam on 04.11.2016.
 */

import {ascending} from 'd3';
import Column from './Column';
import ValueColumn from './ValueColumn';

/**
 * a string column with optional alignment
 */
export default class BooleanColumn extends ValueColumn<boolean> {
  private currentFilter:boolean = null;
  private trueMarker = 'X';
  private falseMarker = '';

  constructor(id:string, desc:any) {
    super(id, desc);
    this.setWidthImpl(30);
    this.trueMarker = desc.trueMarker || this.trueMarker;
    this.falseMarker = desc.falseMarker || this.falseMarker;
  }

  getValue(row:any) {
    var v:any = super.getValue(row);
    if (typeof(v) === 'undefined' || v == null) {
      return false;
    }
    return v === true || v === 'true' || v === 'yes' || v === 'x';
  }

  getLabel(row: any) {
    const v = this.getValue(row);
    return v ? this.trueMarker : this.falseMarker;
  }

  dump(toDescRef:(desc:any) => any):any {
    var r = super.dump(toDescRef);
    if (this.currentFilter !== null) {
      r.filter = this.currentFilter;
    }
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    super.restore(dump, factory);
    if (typeof dump.filter !== 'undefined') {
      this.currentFilter = dump.filter;
    }
  }

  isFiltered() {
    return this.currentFilter !== null;
  }

  filter(row:any) {
    if (!this.isFiltered()) {
      return true;
    }
    var r = this.getValue(row);
    return r === this.currentFilter;
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter:boolean) {
    if (this.currentFilter === filter) {
      return;
    }
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.currentFilter, this.currentFilter = filter);
  }

  compare(a:any[], b:any[]) {
    return ascending(this.getValue(a), this.getValue(b));
  }
}
