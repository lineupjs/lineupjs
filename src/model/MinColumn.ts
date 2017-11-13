/**
 * Created by sam on 04.11.2016.
 */

import CompositeNumberColumn, {ICompositeNumberColumnDesc} from './CompositeNumberColumn';

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

  getColor(row: any, index: number) {
    //compute the index of the maximal one
    const c = this._children;
    if (c.length === 0) {
      return this.color;
    }
    let minIndex = 0, minValue = c[0].getValue(row, index);
    for (let i = 1; i < c.length; ++i) {
      const v = c[i].getValue(row, index);
      if (v < minValue) {
        minIndex = i;
        minValue = v;
      }
      i++;
    }
    return c[minIndex].color;
  }

  protected compute(row: any, index: number) {
    return Math.min(...this._children.map((d) => d.getValue(row, index)));
  }

  /**
   * describe the column if it is a sorting criteria
   * @param toId helper to convert a description to an id
   * @return {string} json compatible
   */
  toSortingDesc(toId: (desc: any) => string): any {
    return {
      operation: 'min',
      operands: this._children.map((c) => c.toSortingDesc(toId))
    };
  }

  get canJustAddNumbers() {
    return true;
  }
}
