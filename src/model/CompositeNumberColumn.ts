import {format} from 'd3-format';
import CompositeColumn from './CompositeColumn';
import {IDataRow, IGroup, IColumnDesc} from './interfaces';
import {isMissingValue} from './missing';
import NumberColumn from './NumberColumn';
import {SortByDefault} from './annotations';
import {ISequence} from '../internal';
import {INumberColumn} from './INumberColumn';

export interface ICompositeNumberDesc extends IColumnDesc {
  /**
   * d3 format number Format
   * @default 0.3n
   */
  numberFormat?: string;
}

export declare type ICompositeNumberColumnDesc = ICompositeNumberDesc & IColumnDesc;

/**
 * implementation of a combine column, standard operations how to select
 */
@SortByDefault('descending')
export default class CompositeNumberColumn extends CompositeColumn implements INumberColumn {
  private readonly numberFormat: (n: number) => string = format('.3n');

  constructor(id: string, desc: Readonly<ICompositeNumberColumnDesc>) {
    super(id, desc);

    if (desc.numberFormat) {
      this.numberFormat = format(desc.numberFormat);
    }
  }

  getNumberFormat() {
    return this.numberFormat;
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
      return null;
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

  iterNumber(row: IDataRow) {
    return [this.getNumber(row)];
  }

  iterRawNumber(row: IDataRow) {
    return [this.getRawNumber(row)];
  }

  getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    if (format === 'json') {
      return {
        value: this.getRawNumber(row),
        children: this.children.map((d) => d.getExportValue(row, format))
      };
    }
    return super.getExportValue(row, format);
  }

  toCompareValue(row: IDataRow) {
    return NumberColumn.prototype.toCompareValue.call(this, row);
  }

  toCompareValueType() {
    return NumberColumn.prototype.toCompareValueType.call(this);
  }

  toCompareGroupValue(rows: ISequence<IDataRow>, group: IGroup) {
    return NumberColumn.prototype.toCompareGroupValue.call(this, rows, group);
  }

  toCompareGroupValueType() {
    return NumberColumn.prototype.toCompareGroupValueType.call(this);
  }

  getRenderer(): string {
    return NumberColumn.prototype.getRenderer.call(this);
  }
}
