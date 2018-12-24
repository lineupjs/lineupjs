import {Category} from './annotations';
import {IKeyValue, IMapColumn} from './IArrayColumn';
import {IDataRow, IValueColumnDesc} from './interfaces';
import ValueColumn from './ValueColumn';

export interface IMapColumnDesc<T> extends IValueColumnDesc<IKeyValue<T>[]> {
  // dummy
}

@Category('map')
export default class MapColumn<T> extends ValueColumn<IKeyValue<T>[]> implements IMapColumn<T> {

  constructor(id: string, desc: Readonly<IMapColumnDesc<T>>) {
    super(id, desc);
    this.setDefaultWidth(200); //by default 200
  }

  getValue(row: IDataRow) {
    const r = this.getMap(row);
    return r.length === 0 ? null : r;
  }

  getLabels(row: IDataRow): IKeyValue<string>[] {
    const v = this.getMap(row);
    return v.map(({key, value}) => ({key, value: String(value)}));
  }

  getMap(row: IDataRow) {
    return toKeyValue<T>(<any>super.getValue(row));
  }

  getMapLabel(row: IDataRow) {
    return this.getLabels(row);
  }

  getLabel(row: IDataRow) {
    const v = this.getLabels(row);
    return `{${v.map(({key, value}) => `${key}: ${value}`).join(', ')}}`;
  }
}

function byKey(a: IKeyValue<any>, b: IKeyValue<any>) {
  if (a === b) {
    return 0;
  }
  return a.key.localeCompare(b.key);
}

function toKeyValue<T>(v?: Map<string, T> | { [key: string]: T } | IKeyValue<T>[]): IKeyValue<T>[] {
  if (!v) {
    return [];
  }
  if (v instanceof Map) {
    return Array.from(v.entries()).map(([key, value]) => ({key, value})).sort(byKey);
  }
  if (Array.isArray(v)) {
    return v; // keep original order
  }
  // object
  return Object.keys(v).map((key) => ({key, value: v[key]})).sort(byKey);
}
