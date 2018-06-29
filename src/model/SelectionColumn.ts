import {Category, SupportType, toolbar} from './annotations';
import {IDataRow, IGroup} from './interfaces';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import ValueColumn, {IValueColumnDesc, dataLoaded} from './ValueColumn';
import {IEventListener} from '../internal/AEventDispatcher';

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
 * emitted when rows are selected
 * @asMemberOf SelectionColumn
 * @param row the (de)seleced row
 * @param value true if selected else false
 * @param rows in case of multiple rows are selected
 * @event
 */
export declare function select(row: IDataRow, value: boolean, rows?: IDataRow[]): void;

/**
 * a checkbox column for selections
 */
@SupportType()
@toolbar('sort', 'sortBy', 'group', 'groupBy')
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

  on(type: typeof SelectionColumn.EVENT_SELECT, listener: typeof select | null): this;
  on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
  on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(<any>type, listener);
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
