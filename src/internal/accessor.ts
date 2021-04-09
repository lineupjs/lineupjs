import type { IDataRow } from '../model';
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
export function resolveValue(value: any, column: string | number) {
  if (value != null && value.hasOwnProperty(column)) {
    // well complex but a direct hit
    return value[column];
  }
  return get(value, column);
}

/**
 * @internal
 */
export function rowComplexGetter(row: IDataRow, desc: any) {
  return resolveValue(row.v, desc.column);
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
