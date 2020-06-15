
import get from 'lodash.get';

/** @internal */
export function resolveValue(row: any, column: string | number) {
  if (row.hasOwnProperty(column)) { // well complex but a direct hit
    return row[column];
  }
  return get(row, column);
}
