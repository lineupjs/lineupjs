/**
 * Created by sam on 04.11.2016.
 */

import CompositeNumberColumn from './CompositeNumberColumn';
import {IDataRow} from './interfaces';

/**
 * factory for creating a description creating a mean column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'Mean') {
  return {type: 'mean', label};
}

export default class MeanColumn extends CompositeNumberColumn {

  protected compute(row: IDataRow) {
    const vs = this._children.map((d) => d.getValue(row)).filter((d) => !isNaN(d));
    return vs.length === 0 ? NaN : vs.reduce((a, b) => a + b, 0) / vs.length;
  }

  get canJustAddNumbers() {
    return true;
  }
}
