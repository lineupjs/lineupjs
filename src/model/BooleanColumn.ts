/**
 * Created by sam on 04.11.2016.
 */

import Column from './Column';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import {ICategoricalColumn} from './ICategoricalColumn';
import {IDataRow} from './interfaces';

export interface IBooleanDesc {
  /**
   * string to show for true
   * @default X
   */
  trueMarker?: string;
  /**
   * strint to show for false
   * @default (empty)
   */
  falseMarker?: string;
}

export declare type IBooleanColumnDesc = IValueColumnDesc<boolean> & IBooleanDesc;

/**
 * a string column with optional alignment
 */
export default class BooleanColumn extends ValueColumn<boolean> implements ICategoricalColumn {
  static readonly GROUP_TRUE = {name: 'True', color: 'black'};
  static readonly GROUP_FALSE = {name: 'False', color: 'white'};

  private currentFilter: boolean | null = null;
  private trueMarker = 'X';
  private falseMarker = '';

  constructor(id: string, desc: IBooleanColumnDesc) {
    super(id, desc);
    this.setWidthImpl(30);
    this.trueMarker = desc.trueMarker || this.trueMarker;
    this.falseMarker = desc.falseMarker || this.falseMarker;
  }

  get categories() {
    return [this.trueMarker, this.falseMarker];
  }

  get categoryLabels() {
    return ['True', 'False'];
  }

  get categoryColors() {
    return ['green', 'red'];
  }

  getValue(row: IDataRow) {
    const v: any = super.getValue(row);
    if (typeof(v) === 'undefined' || v == null) {
      return false;
    }
    return v === true || v === 'true' || v === 'yes' || v === 'x';
  }

  isMissing() {
    return false;
  }

  getCategories(row: IDataRow) {
    const v = this.getValue(row);
    return v ? [this.trueMarker] : [this.falseMarker];
  }

  getColor(row: IDataRow) {
    const flagged = this.getValue(row);
    return flagged ? this.categoryColors[0]: this.categoryColors[1];
  }

  getLabel(row: IDataRow) {
    const v = this.getValue(row);
    return v ? this.trueMarker : this.falseMarker;
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    if (this.currentFilter !== null) {
      r.filter = this.currentFilter;
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (typeof dump.filter !== 'undefined') {
      this.currentFilter = dump.filter;
    }
  }

  isFiltered() {
    return this.currentFilter !== null;
  }

  filter(row: IDataRow) {
    if (!this.isFiltered()) {
      return true;
    }
    const r = this.getValue(row);
    return r === this.currentFilter;
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter: boolean | null) {
    if (this.currentFilter === filter) {
      return;
    }
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.currentFilter, this.currentFilter = filter);
  }

  compare(a: IDataRow, b: IDataRow) {
    const av = this.getValue(a);
    const bv = this.getValue(b);
    return av === bv ? 0 : (av < bv ? -1 : +1);
  }

  group(row: IDataRow) {
    const enabled = this.getValue(row);
    return enabled ? BooleanColumn.GROUP_TRUE : BooleanColumn.GROUP_FALSE;
  }
}
