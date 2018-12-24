import {Category} from './annotations';
import ValueColumn from './ValueColumn';
import {empty} from '../internal';
import {IArrayColumn, IArrayDesc} from './IArrayColumn';
import {IDataRow, IValueColumnDesc} from './interfaces';


export interface IArrayColumnDesc<T> extends IArrayDesc, IValueColumnDesc<T[]> {
  // dummy
}


@Category('array')
export default class ArrayColumn<T> extends ValueColumn<T[]> implements IArrayColumn<T> {
  private readonly _dataLength: number | null;

  private readonly originalLabels: string[];

  constructor(id: string, desc: Readonly<IArrayColumnDesc<T>>) {
    super(id, desc);
    this._dataLength = desc.dataLength == null || isNaN(desc.dataLength) ? null : desc.dataLength;
    this.originalLabels = desc.labels || (empty(this._dataLength == null ? 0 : this._dataLength).map((_d, i) => `Column ${i}`));
  }


  get labels() {
    return this.originalLabels;
  }

  get dataLength() {
    return this._dataLength;
  }

  getValue(row: IDataRow) {
    const r = this.getValues(row);
    return r.every((d) => d === null) ? null : r;
  }

  getValues(row: IDataRow) {
    const r = super.getValue(row);
    return r == null ? [] : r;
  }

  getLabels(row: IDataRow) {
    return this.getValues(row).map(String);
  }

  getLabel(row: IDataRow): string {
    const v = this.getLabels(row);
    if (v.length === 0) {
      return '';
    }
    return v.toString();
  }

  getMap(row: IDataRow) {
    const labels = this.labels;
    return this.getValues(row).map((value, i) => ({key: labels[i], value}));
  }

  getMapLabel(row: IDataRow) {
    const labels = this.labels;
    return this.getLabels(row).map((value, i) => ({key: labels[i], value}));
  }
}

