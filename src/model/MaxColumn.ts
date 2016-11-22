/**
 * Created by sam on 04.11.2016.
 */

import {max as d3max} from 'd3';
import CompositeNumberColumn from './CompositeNumberColumn';

/**
 *  factory for creating a description creating a max column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'Max') {
  return {type: 'max', label: label};
}
/**
 * combines multiple columns by using the maximal value
 */
export default class MaxColumn extends CompositeNumberColumn {

  getColor(row: any) {
    //compute the index of the maximal one
    const c = this._children;
    if (c.length === 0) {
      return this.color;
    }
    var max_i = 0, max_v = c[0].getValue(row);
    for (let i = 1; i < c.length; ++i) {
      let v = c[i].getValue(row);
      if (v > max_v) {
        max_i = i;
        max_v = v;
      }
    }
    return c[max_i].color;
  }

  protected compute(row: any) {
    return d3max(this._children, (d) => d.getValue(row));
  }
}
