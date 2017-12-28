/**
 * Created by sam on 04.11.2016.
 */

import CompositeNumberColumn, {ICompositeNumberColumnDesc} from './CompositeNumberColumn';
import {IDataRow} from './interfaces';

/**
 * factory for creating a description creating a min column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'Min') {
  return {type: 'min', label};
}

export default class MinColumn extends CompositeNumberColumn {

  constructor(id: string, desc: ICompositeNumberColumnDesc) {
    super(id, desc);
    this.setDefaultRenderer('interleaving');
  }

  getColor(row: IDataRow) {
    //compute the index of the maximal one
    const c = this._children;
    if (c.length === 0) {
      return this.color;
    }
    let minIndex = 0, minValue = c[0].getValue(row);
    for (let i = 1; i < c.length; ++i) {
      const v = c[i].getValue(row);
      if (v < minValue) {
        minIndex = i;
        minValue = v;
      }
      i++;
    }
    return c[minIndex].color;
  }

  protected compute(row: IDataRow) {
    return Math.min(...this._children.map((d) => d.getValue(row)));
  }

  get canJustAddNumbers() {
    return true;
  }
}
