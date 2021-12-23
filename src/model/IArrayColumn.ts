import Column from './Column';
import type { IDataRow, IColumnDesc } from './interfaces';

export interface IArrayDesc {
  dataLength?: number;
  labels?: string[];
}

export interface IArrayColumn<T> extends Column {
  readonly labels: string[];
  readonly dataLength: number | null;

  getLabels(row: IDataRow): string[];

  getValues(row: IDataRow): T[];
}

export function isArrayColumn(col: Column): col is IArrayColumn<any>;
export function isArrayColumn(col: IColumnDesc): col is IArrayDesc & IColumnDesc;
export function isArrayColumn(col: Column | IColumnDesc) {
  return (
    (col instanceof Column &&
      typeof (col as IArrayColumn<any>).getLabels === 'function' &&
      typeof (col as IArrayColumn<any>).getValues === 'function') ||
    (!(col instanceof Column) && (col as IColumnDesc).type.endsWith('s') && (col as IColumnDesc).type !== 'actions')
  );
}
