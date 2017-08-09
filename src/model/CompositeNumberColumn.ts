/**
 * Created by sam on 04.11.2016.
 */

import {format} from 'd3';
import Column, {IColumnDesc} from './Column';
import CompositeColumn from './CompositeColumn';
import NumberColumn, {INumberColumn, numberCompare} from './NumberColumn';

export interface ICompositeNumberDesc extends IColumnDesc {
  /**
   * d3 format number Format
   * @default 0.3n
   */
  numberFormat?: string;

  /**
   * missing value to use
   * @default 0
   */
  missingValue?: number;
}

/**
 * implementation of a combine column, standard operations how to select
 */
export default class CompositeNumberColumn extends CompositeColumn implements INumberColumn {
  missingValue = 0;

  private numberFormat: (n: number) => string = format('.3n');

  constructor(id: string, desc: ICompositeNumberDesc) {
    super(id, desc);

    if (desc.numberFormat) {
      this.numberFormat = format(desc.numberFormat);
    }

    if (desc.missingValue !== undefined) {
      this.missingValue = desc.missingValue;
    }
  }


  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.missingValue = this.missingValue;
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column|null) {
    if (dump.missingValue !== undefined) {
      this.missingValue = dump.missingValue;
    }
    if (dump.numberFormat) {
      this.numberFormat = format(dump.numberFormat);
    }
    super.restore(dump, factory);
  }

  getLabel(row: any, index: number) {
    if (!this.isLoaded()) {
      return '';
    }
    const v = this.getValue(row, index);
    //keep non number if it is not a number else convert using formatter
    return String(typeof v === 'number' ? this.numberFormat(v) : v);
  }

  getValue(row: any, index: number) {
    if (!this.isLoaded()) {
      return null;
    }
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
    const r = this.getValue(row, index);
    return r === null ? NaN : r;
  }

  getRawNumber(row: any, index: number) {
    return this.getNumber(row, index);
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    return numberCompare(this.getNumber(a, aIndex), this.getNumber(b, bIndex));
  }

  getRendererType(): string {
    return NumberColumn.prototype.getRendererType.call(this);
  }
}
