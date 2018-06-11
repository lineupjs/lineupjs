import {format} from 'd3-format';
import Column, {IColumnDesc} from './Column';
import CompositeColumn from './CompositeColumn';
import {IDataRow, IGroupData} from './interfaces';
import {isMissingValue} from './missing';
import NumberColumn, {INumberColumn} from './NumberColumn';

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

  constructor(id: string, desc: Readonly<ICompositeNumberColumnDesc>) {
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

  restore(dump: any, factory: (dump: any) => Column | null) {
    if (dump.missingValue !== undefined) {
      this.missingValue = dump.missingValue;
    }
    if (dump.numberFormat) {
      this.numberFormat = format(dump.numberFormat);
    }
    super.restore(dump, factory);
  }

  getLabel(row: IDataRow) {
    if (!this.isLoaded()) {
      return '';
    }
    const v = this.getValue(row);
    //keep non number if it is not a number else convert using formatter
    return String(typeof v === 'number' && !isNaN(v) && isFinite(v) ? this.numberFormat(v) : v);
  }

  getValue(row: IDataRow) {
    if (!this.isLoaded()) {
      return null;
    }
    //weighted sum
    const v = this.compute(row);
    if (isMissingValue(v)) {
      return this.missingValue;
    }
    return v;
  }

  protected compute(_row: IDataRow) {
    return NaN;
  }

  getNumber(row: IDataRow) {
    const r = this.getValue(row);
    return r == null ? NaN : r;
  }

  getRawNumber(row: IDataRow) {
    return this.getNumber(row);
  }

  isMissing(row: IDataRow) {
    return isMissingValue(this.compute(row));
  }

  compare(a: IDataRow, b: IDataRow) {
    return NumberColumn.prototype.compare.call(this, a, b);
  }

  groupCompare(a: IGroupData, b: IGroupData) {
    return NumberColumn.prototype.groupCompare.call(this, a, b);
  }

  getRenderer(): string {
    return NumberColumn.prototype.getRenderer.call(this);
  }
}
