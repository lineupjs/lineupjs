/**
 * Created by sam on 04.11.2016.
 */

import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import {IGroup} from './Group';

/**
 * factory for creating a description creating a rank column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'S') {
  return {type: 'selection', label, description: 'Selection'};
}

export interface ISelectionColumnDesc extends IValueColumnDesc<boolean> {
  /**
   * setter for selecting/deselecting the given row
   */
  setter(row: any, index: number, value: boolean): void;
  /**
   * setter for selecting/deselecting the given row
   */
  setterAll(rows: any[], indices: number[], value: boolean): void;
}

/**
 * a checkbox column for selections
 */
export default class SelectionColumn extends ValueColumn<boolean> {
  private static SELECTED_GROUP: IGroup = {
    name: 'Selected',
    color: 'orange'
  };
  private static NOT_SELECTED_GROUP: IGroup = {
    name: 'Unselected',
    color: 'gray'
  };
  static readonly EVENT_SELECT = 'select';

  constructor(id: string, desc: ISelectionColumnDesc) {
    super(id, desc);
    this.setWidth(20);
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

  setValues(rows: any[], indices: number[], value: boolean) {
    if (rows.length === 0) {
      return;
    }
    if ((<ISelectionColumnDesc>this.desc).setterAll) {
      (<ISelectionColumnDesc>this.desc).setterAll(rows, indices, value);
    }
    this.fire(SelectionColumn.EVENT_SELECT, rows[0], value, rows);
    return true;
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
    const va = this.getValue(a, aIndex) === true;
    const vb = this.getValue(b, bIndex) === true;
    return va === vb ? 0 : (va < vb ? -1 : +1);
  }

  group(row: any, index: number) {
    const isSelected = this.getValue(row, index);
    return isSelected ? SelectionColumn.SELECTED_GROUP: SelectionColumn.NOT_SELECTED_GROUP;
  }
}
