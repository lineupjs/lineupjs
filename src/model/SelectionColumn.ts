/**
 * Created by sam on 04.11.2016.
 */

import {ascending} from 'd3';
import ValueColumn from './ValueColumn';

/**
 * factory for creating a description creating a rank column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'S') {
  return {type: 'selection', label: label};
}

/**
 * a checkbox column for selections
 */
export default class SelectionColumn extends ValueColumn<boolean> {
  static EVENT_SELECT = 'select';

  constructor(id: string, desc: any) {
    super(id, desc);
    this.setCompressed(true);
  }

  protected createEventList() {
    return super.createEventList().concat([SelectionColumn.EVENT_SELECT]);
  }

  setValue(row: any, value: boolean) {
    const old = this.getValue(row);
    if (old === value) {
      return true;
    }
    return this.setImpl(row, value);
  }

  private setImpl(row: any, value: boolean) {
    if ((<any>this.desc).setter) {
      (<any>this.desc).setter(row, value);
    }
    this.fire(SelectionColumn.EVENT_SELECT, row, value);
    return true;
  }

  toggleValue(row: any) {
    const old = this.getValue(row);
    this.setImpl(row, !old);
    return !old;
  }

  compare(a: any, b: any) {
    return ascending(this.getValue(a), this.getValue(b));
  }
}
