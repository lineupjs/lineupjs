/**
 * Created by sam on 04.11.2016.
 */

import {ascending} from 'd3';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';

/**
 * factory for creating a description creating a rank column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'S') {
  return {type: 'selection', label};
}

export interface ISelectionColumnDesc extends IValueColumnDesc<boolean> {
  /**
   * setter for selecting/deselecting the given row
   */
  setter(row: any, index: number, value: boolean): void;
}
/**
 * a checkbox column for selections
 */
export default class SelectionColumn extends ValueColumn<boolean> {
  static readonly EVENT_SELECT = 'select';

  constructor(id: string, desc: ISelectionColumnDesc) {
    super(id, desc);
    this.setCompressed(true);
  }

  protected createEventList() {
    return super.createEventList().concat([SelectionColumn.EVENT_SELECT]);
  }

  setValue(row: any, index: number, value: boolean) {
    const old = this.getValue(row, index);
    if (old === value) {
      return true;
    }
    return this.setImpl(row, index, value);
  }

  private setImpl(row: any, index: number, value: boolean) {
    if ((<ISelectionColumnDesc>this.desc).setter) {
      (<ISelectionColumnDesc>this.desc).setter(row, index, value);
    }
    this.fire(SelectionColumn.EVENT_SELECT, row, value);
    return true;
  }

  toggleValue(row: any, index: number) {
    const old = this.getValue(row, index);
    this.setImpl(row, index, !old);
    return !old;
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    return ascending(this.getValue(a, aIndex), this.getValue(b, bIndex));
  }
}
