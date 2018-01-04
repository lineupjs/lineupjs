/**
 * Created by Samuel Gratzl on 17.11.2017.
 */


import Column, {IColumnDesc} from './Column';
import CompositeColumn from './CompositeColumn';
import {ICategoricalColumn, isCategoricalColumn} from './ICategoricalColumn';
import {IDataRow, IGroupData} from './interfaces';
import {isNumberColumn} from './INumberColumn';
import NumberColumn, {INumberColumn} from './NumberColumn';


/**
 *  factory for creating a description creating a max column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'Imposition') {
  return {type: 'imposition', label};
}

/**
 * implementation of a combine column, standard operations how to select
 */
export default class ImpositionCompositeColumn extends CompositeColumn implements INumberColumn {
  constructor(id: string, desc: Readonly<IColumnDesc>) {
    super(id, desc);

    this.setDefaultRenderer('number');
    this.setDefaultGroupRenderer('boxplot');
  }

  getLabel(row: IDataRow) {
    const c = this._children;
    if (c.length === 0) {
      return '';
    }
    if (c.length === 1) {
      return c[0].getLabel(row);
    }
    return `${c[0].getLabel(row)} (${c.slice(1).map((c) => `${c.label} = ${c.getLabel(row)}`)})`;
  }

  getValue(row: IDataRow) {
    const c = this._children;
    return c.length === 0 ? NaN : c[0].getValue(row);
  }

  getColor(row: IDataRow) {
    const c = this._children;
    if (c.length < 2) {
      return this.color;
    }
    const v = (<ICategoricalColumn><any>c[1]).getCategory(row);
    return v ? v.color : this.color;
  }

  getNumber(row: IDataRow) {
    const r = this.getValue(row);
    return r == null ? NaN : r;
  }

  getRawNumber(row: IDataRow) {
    return this.getNumber(row);
  }

  isMissing(row: IDataRow) {
    return this._children.length === 0 || this._children[0].isMissing(row);
  }

  compare(a: IDataRow, b: IDataRow) {
    return NumberColumn.prototype.compare.call(this, a, b);
  }

  groupCompare(a: IGroupData, b: IGroupData) {
    return NumberColumn.prototype.groupCompare.call(this, a, b);
  }

  insert(col: Column, index: number): Column | null {
    if (this._children.length === 0 && !isNumberColumn(col)) {
      return null;
    }
    if (this._children.length === 1 && !isCategoricalColumn(col)) {
      return null;
    }
    if (this._children.length >= 2) {
      // limit to two
      return null;
    }
    return super.insert(col, index);
  }
}
