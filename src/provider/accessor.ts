import {IDataRow} from '../model';


/**
 * @internal
 */
export function isComplexAccessor(column: any) {
  // something like a.b or a[4]
  return typeof column === 'string' && column.includes('.');
}


/**
 * @internal
 */
export function rowComplexGetter(row: IDataRow, desc: any) {
  const column = desc.column;
  if (row.hasOwnProperty(column)) { // well complex but a direct hit
    return row.v[column];
  }
  const resolve = (obj: any, col: string) => {
    if (obj === undefined) {
      return obj; // propagate invalid values
    }
    if (/\d+/.test(col)) { // index
      return obj[+col];
    }
    return obj[col];
  };
  return column.split('.').reduce(resolve, row.v);
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

