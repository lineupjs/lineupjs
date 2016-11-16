/**
 * Created by sam on 04.11.2016.
 */

import {format} from 'd3';
import Column from './Column';
import CompositeColumn from './CompositeColumn';
import {INumberColumn, isNumberColumn, numberCompare} from './NumberColumn';

/**
 * implementation of a combine column, standard operations how to select
 */
export default class CompositeNumberColumn extends CompositeColumn implements INumberColumn {
  public missingValue = 0;

  private numberFormat: (n: number) => string = format('.3n');

  constructor(id: string, desc: any) {
    super(id, desc);

    if (desc.numberFormat) {
      this.numberFormat = format(desc.numberFormat);
    }
  }


  dump(toDescRef: (desc: any) => any) {
    var r = super.dump(toDescRef);
    r.missingValue = this.missingValue;
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column) {
    if (dump.missingValue) {
      this.missingValue = dump.missingValue;
    }
    if (dump.numberFormat) {
      this.numberFormat = format(dump.numberFormat);
    }
    super.restore(dump, factory);
  }

  /**
   * inserts a column at a the given position
   * @param col
   * @param index
   * @param weight
   * @returns {any}
   */
  insert(col: Column, index: number) {
    if (!isNumberColumn(col)) { //indicator it is a number type
      return null;
    }
    return super.insert(col, index);
  }

  getLabel(row: any) {
    const v = this.getValue(row);
    //keep non number if it is not a number else convert using formatter
    return '' + (typeof v === 'number' ? this.numberFormat(v) : v);
  }

  getValue(row: any) {
    //weighted sum
    const v = this.compute(row);
    if (typeof(v) === 'undefined' || v == null || isNaN(v)) {
      return this.missingValue;
    }
    return v;
  }

  protected compute(row: any) {
    return NaN;
  }

  getNumber(row: any) {
    return this.getValue(row);
  }

  compare(a: any, b: any) {
    return numberCompare(this.getValue(a), this.getValue(b));
  }
}
