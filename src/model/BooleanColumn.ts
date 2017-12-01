/**
 * Created by sam on 04.11.2016.
 */

import Column from './Column';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import {ICategoricalColumn} from './ICategoricalColumn';

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

  getValue(row: any, index: number) {
    const v: any = super.getValue(row, index);
    if (typeof(v) === 'undefined' || v == null) {
      return false;
    }
    return v === true || v === 'true' || v === 'yes' || v === 'x';
  }

  isMissing() {
    return false;
  }

  getCategories(row: any, index: number) {
    const v = this.getValue(row, index);
    return v ? [this.trueMarker] : [this.falseMarker];
  }

  getColor(row: any, index: number) {
    const flagged = this.getValue(row, index);
    return flagged ? this.categoryColors[0]: this.categoryColors[1];
  }

  getLabel(row: any, index: number) {
    const v = this.getValue(row, index);
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

  filter(row: any, index: number) {
    if (!this.isFiltered()) {
      return true;
    }
    const r = this.getValue(row, index);
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

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    const av = this.getValue(a, aIndex);
    const bv = this.getValue(b, bIndex);
    return av === bv ? 0 : (av < bv ? -1 : +1);
  }

  group(row: any, index: number) {
    const enabled = this.getValue(row, index);
    return enabled ? BooleanColumn.GROUP_TRUE : BooleanColumn.GROUP_FALSE;
  }
}
