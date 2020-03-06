import {IDataRow} from '../model';
import get from 'lodash.get';

/**
 * @internal
 */
export function isComplexAccessor(column: any) {
  // something like a.b or a[4]
  return typeof column === 'string' && (column.includes('.') || column.includes('['));
}


/**
 * @internal
 */
export function rowComplexGetter(row: IDataRow, desc: any) {
  const column = desc.column;
  if (row.v.hasOwnProperty(column)) { // well complex but a direct hit
    return row.v[column];
  }
  return get(row.v, column);
}


/**
 * simple row getter
 * @internal
 */
export function rowGetter(row: IDataRow, desc: any) {
  return row.v[desc.column];
}


/**
 * @internal
 */
export function rowGuessGetter(row: IDataRow, desc: any) {
  const column = desc.column;
  if (isComplexAccessor(column)) {
    return rowComplexGetter(row, desc);
  }
  return rowGetter(row, desc);
}

