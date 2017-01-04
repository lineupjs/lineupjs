/**
 * Created by sam on 04.11.2016.
 */

import Column from './Column';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';

export interface IStringColumnDesc extends IValueColumnDesc<string> {
  /**
   * column alignment: left, center, right
   * @default left
   */
  readonly alignment?: string;
}

/**
 * a string column with optional alignment
 */
export default class StringColumn extends ValueColumn<string> {
  //magic key for filtering missing ones
  static readonly FILTER_MISSING = '__FILTER_MISSING';
  private currentFilter: string|RegExp = null;

  private _alignment: string = 'left';

  constructor(id: string, desc: IStringColumnDesc) {
    super(id, desc);
    this.setWidthImpl(200); //by default 200
    this._alignment = desc.alignment || 'left';
  }

  //readonly
  get alignment() {
    return this._alignment;
  }

  getValue(row: any, index: number) {
    const v: any = super.getValue(row, index);
    if (typeof(v) === 'undefined' || v == null) {
      return '';
    }
    return String(v);
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    if (this.currentFilter instanceof RegExp) {
      r.filter = 'REGEX:' + (<RegExp>this.currentFilter).source;
    } else {
      r.filter = this.currentFilter;
    }
    r.alignment = this.alignment;
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column) {
    super.restore(dump, factory);
    if (dump.filter && dump.filter.slice(0, 6) === 'REGEX:') {
      this.currentFilter = new RegExp(dump.filter.slice(6));
    } else {
      this.currentFilter = dump.filter || null;
    }
    this._alignment = dump.alignment || this._alignment;
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row: any, index: number) {
    if (!this.isFiltered()) {
      return true;
    }
    const r = this.getLabel(row, index),
      filter = this.currentFilter;

    if (filter === StringColumn.FILTER_MISSING) { //filter empty
      return r != null && r.trim() !== '';
    }
    if (typeof filter === 'string' && filter.length > 0) {
      return r && r.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
    }
    if (filter instanceof RegExp) {
      return r && filter.test(r);
    }
    return true;
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter: string|RegExp) {
    if (filter === '') {
      filter = null;
    }
    if (this.currentFilter === filter) {
      return;
    }
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.currentFilter, this.currentFilter = filter);
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    let aValue: string, bValue: string;
    if ((aValue = this.getValue(a, aIndex)) === '') {
      return this.getValue(b, bIndex) === '' ? 0 : +1; //same = 0
    } else if ((bValue = this.getValue(b, bIndex)) === '') {
      return -1;
    }
    return aValue.localeCompare(bValue);
  }
}
