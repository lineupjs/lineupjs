/**
 * Created by sam on 04.11.2016.
 */

import {format} from 'd3';
import Column from './Column';
import CompositeColumn from './CompositeColumn';
import NumberColumn, {INumberColumn, isNumberColumn, numberCompare} from './NumberColumn';

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
    let r = super.dump(toDescRef);
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
   * @returns {any}
   */
  insert(col: Column, index: number) {
    if (!isNumberColumn(col)) { //indicator it is a number type
      return null;
    }
    return super.insert(col, index);
  }

  getLabel(row: any, index: number) {
    const v = this.getValue(row, index);
    //keep non number if it is not a number else convert using formatter
    return '' + (typeof v === 'number' ? this.numberFormat(v) : v);
  }

  getValue(row: any, index: number) {
    //weighted sum
    const v = this.compute(row, index);
    if (typeof(v) === 'undefined' || v == null || isNaN(v)) {
      return this.missingValue;
    }
    return v;
  }

  protected compute(row: any, index: number) {
    return NaN;
  }

  getNumber(row: any, index: number) {
    return this.getValue(row, index);
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    return numberCompare(this.getValue(a, aIndex), this.getValue(b, bIndex));
  }

  rendererType(): string {
    return NumberColumn.prototype.rendererType.call(this);
  }
}
