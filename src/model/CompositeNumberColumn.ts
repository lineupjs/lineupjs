/**
 * Created by sam on 04.11.2016.
 */

import {format} from 'd3';
import Column, {IColumnDesc} from './Column';
import CompositeColumn from './CompositeColumn';
import NumberColumn, {INumberColumn} from './NumberColumn';
import {isMissingValue} from './missing';
import {IGroupData} from '../ui/engine/interfaces';

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

export declare type ICompositeNumberColumnDesc = ICompositeNumberDesc & IColumnDesc;

/**
 * implementation of a combine column, standard operations how to select
 */
export default class CompositeNumberColumn extends CompositeColumn implements INumberColumn {
  missingValue = NaN;

  private numberFormat: (n: number) => string = format('.3n');

  constructor(id: string, desc: ICompositeNumberColumnDesc) {
    super(id, desc);

    if (desc.numberFormat) {
      this.numberFormat = format(desc.numberFormat);
    }

    if (desc.missingValue !== undefined) {
      this.missingValue = desc.missingValue;
    }

    this.setDefaultRenderer('interleaving');
    this.setDefaultGroupRenderer('interleaving');
  }


  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.missingValue = this.missingValue;
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
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
    return String(typeof v === 'number' && !isNaN(v) && isFinite(v) ? this.numberFormat(v) : v);
  }

  getValue(row: any, index: number) {
    if (!this.isLoaded()) {
      return null;
    }
    //weighted sum
    const v = this.compute(row, index);
    if (isMissingValue(v)) {
      return this.missingValue;
    }
    return v;
  }

  protected compute(_row: any, _index: number) {
    return NaN;
  }

  getNumber(row: any, index: number) {
    const r = this.getValue(row, index);
    return r === null ? NaN : r;
  }

  getRawNumber(row: any, index: number) {
    return this.getNumber(row, index);
  }

  isMissing(row: any, index: number) {
    return isMissingValue(this.compute(row, index));
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    return NumberColumn.prototype.compare.call(this, a, b, aIndex, bIndex);
  }

  groupCompare(a: IGroupData, b: IGroupData) {
    return NumberColumn.prototype.groupCompare.call(this, a, b);
  }

  getRendererType(): string {
    return NumberColumn.prototype.getRendererType.call(this);
  }
}
