/**
 * Created by Samuel Gratzl on 17.11.2017.
 */


import CompositeColumn from './CompositeColumn';
import NumberColumn, {INumberColumn} from './NumberColumn';
import {IColumnDesc} from './Column';
import {IGroupData} from '../ui/engine/interfaces';
import Column from './Column';
import {isNumberColumn} from './INumberColumn';
import {ICategoricalColumn, isCategoricalColumn} from './ICategoricalColumn';


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
  constructor(id: string, desc: IColumnDesc) {
    super(id, desc);

    this.setDefaultRenderer('number');
    this.setDefaultGroupRenderer('boxplot');
  }

  getLabel(row: any, index: number) {
    const c = this._children;
    if (c.length === 0) {
      return '';
    }
    if (c.length === 1) {
      return c[0].getLabel(row, index);
    }
    return `${c[0].getLabel(row, index)} (${c.slice(1).map((c) => `${c.label} = ${c.getLabel(row, index)}`)})`;
  }

  getValue(row: any, index: number) {
    const c = this._children;
    return c.length === 0 ? NaN : c[0].getValue(row, index);
  }

  getColor(row: any, index: number) {
    const c = this._children;
    return c.length < 2 ? this.color : (<ICategoricalColumn><any>c[1]).getColor(row, index);
  }

  getNumber(row: any, index: number) {
    const r = this.getValue(row, index);
    return r === null ? NaN : r;
  }

  getRawNumber(row: any, index: number) {
    return this.getNumber(row, index);
  }

  isMissing(row: any, index: number) {
    return this._children.length === 0 || this._children[0].isMissing(row, index);
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    return NumberColumn.prototype.compare.call(this, a, b, aIndex, bIndex);
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
