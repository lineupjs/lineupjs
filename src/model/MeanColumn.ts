/**
 * Created by sam on 04.11.2016.
 */

import {mean as d3mean} from 'd3';
import CompositeNumberColumn from './CompositeNumberColumn';

/**
 * factory for creating a description creating a mean column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'Mean') {
  return {type: 'mean', label};
}

export default class MeanColumn extends CompositeNumberColumn {

  protected compute(row: any, index: number) {
    return d3mean(this._children, (d) => d.getValue(row, index));
  }

  /**
   * describe the column if it is a sorting criteria
   * @param toId helper to convert a description to an id
   * @return {string} json compatible
   */
  toSortingDesc(toId: (desc: any) => string): any {
    return {
      operation: 'avg',
      operands: this._children.map((c) => c.toSortingDesc(toId))
    };
  }
}
