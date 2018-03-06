import {suffix} from '../internal/AEventDispatcher';
import {toolbar} from './annotations';
import Column, {IColumnDesc} from './Column';
import CompositeColumn from './CompositeColumn';
import {ICategoricalColumn, isCategoricalColumn} from './ICategoricalColumn';
import {IDataRow, IGroupData} from './interfaces';
import {isNumberColumn} from './INumberColumn';
import NumberColumn, {INumberColumn} from './NumberColumn';


/**
 *  factory for creating a description creating a max column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createImpositionDesc(label: string = 'Imposition') {
  return {type: 'imposition', label};
}

/**
 * implementation of a combine column, standard operations how to select
 */
@toolbar('filterMapped')
export default class ImpositionCompositeColumn extends CompositeColumn implements INumberColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;

  constructor(id: string, desc: Readonly<IColumnDesc>) {
    super(id, desc);

    this.setDefaultRenderer('number');
    this.setDefaultGroupRenderer('boxplot');
  }

  get label() {
    const l = super.getMetaData().label;
    const c = this._children;
    if (l !== 'Imposition' || c.length === 0) {
      return l;
    }
    if (c.length === 1) {
      return c[0].label;
    }
    return `${c[0].label} (${c.slice(1).map((c) => c.label).join(', ')})`;
  }

  private get wrapper(): INumberColumn | null {
    const c = this._children;
    return c.length === 0 ? null : <INumberColumn>c[0];
  }

  protected createEventList() {
    return super.createEventList().concat([ImpositionCompositeColumn.EVENT_MAPPING_CHANGED]);
  }

  getLabel(row: IDataRow) {
    const c = this._children;
    if (c.length === 0) {
      return '';
    }
    if (c.length === 1) {
      return c[0].getLabel(row);
    }
    return `${c[0].getLabel(row)} (${c.slice(1).map((c) => `${c.label} = ${c.getLabel(row)}`).join(', ')})`;
  }

  getColor(row: IDataRow) {
    const c = this._children;
    if (c.length < 2) {
      return this.color;
    }
    const v = (<ICategoricalColumn><any>c[1]).getCategory(row);
    return v ? v.color : this.color;
  }

  getValue(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getValue(row) : [];
  }

  getNumber(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getNumber(row) : NaN;
  }

  getRawNumber(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getRawNumber(row) : NaN;
  }

  isMissing(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.isMissing(row) : true;
  }

  compare(a: IDataRow, b: IDataRow) {
    return NumberColumn.prototype.compare.call(this, a, b);
  }

  group(row: IDataRow) {
    return NumberColumn.prototype.group.call(this, row);
  }

  groupCompare(a: IGroupData, b: IGroupData) {
    return NumberColumn.prototype.groupCompare.call(this, a, b);
  }

  insert(col: Column, index: number): Column | null {
    if (this._children.length === 0 && !isNumberColumn(col)) {
      return null;
    }
    if (this._children.length === 1 && !isCategoricalColumn(col)) {
      return null;
    }
    if (this._children.length >= 2) {
      // limit to two
      return null;
    }
    return super.insert(col, index);
  }

  protected insertImpl(col: Column, index: number) {
    if (isNumberColumn(col)) {
      this.forward(col, ...suffix('.impose', NumberColumn.EVENT_MAPPING_CHANGED));
    }
    return super.insertImpl(col, index);
  }

  protected removeImpl(child: Column, index: number) {
    if (isNumberColumn(child)) {
      this.unforward(child, ...suffix('.impose', NumberColumn.EVENT_MAPPING_CHANGED));
    }
    return super.removeImpl(child, index);
  }
}
