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
  return {type: 'mean', label: label};
}

export default class MeanColumn extends CompositeNumberColumn {

  protected compute(row: any) {
    return d3mean(this._children, (d) => d.getValue(row));
  }
}
