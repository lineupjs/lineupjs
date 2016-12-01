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

  getColor(row: any, index: number) {
    //compute the index of the maximal one
    const c = this._children;
    if (c.length === 0) {
      return this.color;
    }
    let max_i = 0, max_v = c[0].getValue(row, index);
    for (let i = 1; i < c.length; ++i) {
      let v = c[i].getValue(row, index);
      if (v > max_v) {
        max_i = i;
        max_v = v;
      }
    }
    return c[max_i].color;
  }

  protected compute(row: any, index: number) {
    return d3max(this._children, (d) => d.getValue(row, index));
  }

  /**
   * describe the column if it is a sorting criteria
   * @param toId helper to convert a description to an id
   * @return {string} json compatible
   */
  toSortingDesc(toId: (desc: any) => string): any {
    return {
      operation: 'max',
      operands: this._children.map((c) => c.toSortingDesc(toId))
    };
  }
}
