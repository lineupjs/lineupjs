import Column from './Column';
import {IDataRow, IColumnDesc} from './interfaces';


export interface IArrayDesc {
  dataLength?: number;
  labels?: string[];
}

export interface IKeyValue<T> {
  key: string;
  value: T;
}

export interface IMapColumn<T> extends Column {
  getMap(row: IDataRow): IKeyValue<T>[];

  getMapLabel(row: IDataRow): IKeyValue<string>[];
}

export function isMapColumn(col: Column): col is IMapColumn<any>;
export function isMapColumn(col: IColumnDesc): boolean;
export function isMapColumn(col: Column | IColumnDesc) {
  return (col instanceof Column && typeof (<IMapColumn<any>>col).getMap === 'function' && typeof (<IMapColumn<any>>col).getMapLabel === 'function') || (!(col instanceof Column) && (<IColumnDesc>col).type.endsWith('Map'));
}

export interface IArrayColumn<T> extends IMapColumn<T> {
  readonly labels: string[];
  readonly dataLength: number | null;

  getLabels(row: IDataRow): string[];

  getValues(row: IDataRow): T[];
}

export function isArrayColumn(col: Column): col is IArrayColumn<any>;
export function isArrayColumn(col: IColumnDesc): col is IArrayDesc & IColumnDesc;
export function isArrayColumn(col: Column | IColumnDesc) {
  return (col instanceof Column && typeof (<IArrayColumn<any>>col).getLabels === 'function' && typeof (<IArrayColumn<any>>col).getValues === 'function' && isMapColumn(col) || (!(col instanceof Column) && (<IColumnDesc>col).type.endsWith('s') && (<IColumnDesc>col).type !== 'actions'));
}
