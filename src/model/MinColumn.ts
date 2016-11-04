/**
 * Created by sam on 04.11.2016.
 */

import {min as d3min} from 'd3';
import CompositeNumberColumn from './CompositeNumberColumn';

/**
 * factory for creating a description creating a min column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'Min') {
  return {type: 'min', label: label};
}


export default class MinColumn extends CompositeNumberColumn {

  getColor(row: any) {
    //compute the index of the maximal one
    const c = this._children;
    if (c.length === 0) {
      return this.color;
    }
    var min_i = 0, min_v = c[0].getValue(row);
    for (let i = 1; i < c.length; ++i) {
      let v = c[i].getValue(row);
      if (v < min_v) {
        min_i = i;
        min_v = v;
      }
    }
    return c[min_i].color;
  }

  protected compute(row: any) {
    return d3min(this._children, (d) => d.getValue(row));
  }
}
