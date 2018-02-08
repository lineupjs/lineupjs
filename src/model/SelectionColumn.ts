import {Category, SupportType, toolbar} from './annotations';
import {IDataRow, IGroup} from './interfaces';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';

/**
 * factory for creating a description creating a rank column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createSelectionDesc(label: string = 'Selection Checkboxes') {
  return {type: 'selection', label, fixed: true};
}

export interface ISelectionColumnDesc extends IValueColumnDesc<boolean> {
  /**
   * setter for selecting/deselecting the given row
   */
  setter(row: IDataRow, value: boolean): void;

  /**
   * setter for selecting/deselecting the given row
   */
  setterAll(rows: IDataRow[], value: boolean): void;
}

/**
 * a checkbox column for selections
 */
@SupportType()
@toolbar('sort', 'stratify')
@Category('support')
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

  constructor(id: string, desc: Readonly<ISelectionColumnDesc>) {
    super(id, desc);
    this.setDefaultWidth(20);
  }

  get frozen() {
    return this.desc.frozen !== false;
  }

  protected createEventList() {
    return super.createEventList().concat([SelectionColumn.EVENT_SELECT]);
  }

  setValue(row: IDataRow, value: boolean) {
    const old = this.getValue(row);
    if (old === value) {
      return true;
    }
    return this.setImpl(row, value);
  }

  setValues(rows: IDataRow[], value: boolean) {
    if (rows.length === 0) {
      return;
    }
    if ((<ISelectionColumnDesc>this.desc).setterAll) {
      (<ISelectionColumnDesc>this.desc).setterAll(rows, value);
    }
    this.fire(SelectionColumn.EVENT_SELECT, rows[0], value, rows);
    return true;
  }

  private setImpl(row: IDataRow, value: boolean) {
    if ((<ISelectionColumnDesc>this.desc).setter) {
      (<ISelectionColumnDesc>this.desc).setter(row, value);
    }
    this.fire(SelectionColumn.EVENT_SELECT, row, value);
    return true;
  }

  toggleValue(row: IDataRow) {
    const old = this.getValue(row);
    this.setImpl(row, !old);
    return !old;
  }

  compare(a: IDataRow, b: IDataRow) {
    const va = this.getValue(a) === true;
    const vb = this.getValue(b) === true;
    return va === vb ? 0 : (va < vb ? -1 : +1);
  }

  group(row: IDataRow) {
    const isSelected = this.getValue(row);
    return isSelected ? SelectionColumn.SELECTED_GROUP : SelectionColumn.NOT_SELECTED_GROUP;
  }
}
