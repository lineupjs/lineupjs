import Column from './Column';
import {IDataRow} from './interfaces';


export interface IKeyValue<T> {
  key: string;
  value: T;
}

export interface IMapColumn<T> extends Column {
  getMap(row: IDataRow): IKeyValue<T>[];

  getMapLabel(row: IDataRow): IKeyValue<string>[];
}

export function isMapColumn(col: Column): col is IMapColumn<any> {
  return typeof (<IMapColumn<any>>col).getMap === 'function' && typeof (<IMapColumn<any>>col).getMapLabel === 'function';
}

export interface IArrayColumn<T> extends IMapColumn<T> {
  readonly labels: string[];
  readonly dataLength: number | null;

  getLabels(row: IDataRow): string[];

  getValues(row: IDataRow): T[];
}

export function isArrayColumn(col: Column): col is IArrayColumn<any> {
  return typeof (<IArrayColumn<any>>col).getLabels === 'function' && typeof (<IArrayColumn<any>>col).getValues === 'function' && isMapColumn(col);
}
