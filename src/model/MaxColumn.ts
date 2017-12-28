/**
 * Created by sam on 04.11.2016.
 */

import CompositeNumberColumn, {ICompositeNumberColumnDesc} from './CompositeNumberColumn';
import {IDataRow} from './interfaces';

/**
 *  factory for creating a description creating a max column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'Max') {
  return {type: 'max', label};
}

/**
 * combines multiple columns by using the maximal value
 */
export default class MaxColumn extends CompositeNumberColumn {

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
    let maxIndex = 0, maxValue = c[0].getValue(row);
    for (let i = 1; i < c.length; ++i) {
      const v = c[i].getValue(row);
      if (v > maxValue) {
        maxIndex = i;
        maxValue = v;
      }
    }
    return c[maxIndex].color;
  }

  protected compute(row: IDataRow) {
    return Math.max(...this._children.map((d) => d.getValue(row)));
  }

  get canJustAddNumbers() {
    return true;
  }
}
