/**
 * Created by sam on 04.11.2016.
 */

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
    const vs = this._children.map((d) => d.getValue(row, index)).filter((d) => !isNaN(d));
    return vs.length === 0 ? NaN: vs.reduce((a, b) => a + b, 0) / vs.length;
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

  get canJustAddNumbers() {
    return true;
  }
}
