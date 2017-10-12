import {FIRST_IS_NAN} from './missing';
import Column, {IColumnDesc} from './Column';
import {IDataRow} from '../provider/ADataProvider';


export interface INumberColumn {
  getNumber(row: any, index: number): number;

  getRawNumber(row: any, index: number): number;
}

export default INumberColumn;


export interface INumberDesc {
  /**
   * dump of mapping function
   */
  readonly map?: any;
  /**
   * either map or domain should be available
   */
  readonly domain?: [number, number];
  /**
   * @default [0,1]
   */
  readonly range?: [number, number];
  /**
   * d3 formatting option
   * @default .3n
   */
  readonly numberFormat?: string;

  /**
   * missing value to use
   * @default 0
   */
  readonly missingValue?: number;
}

/**
 * checks whether the given column or description is a number column, i.e. the value is a number
 * @param col
 * @returns {boolean}
 */
export function isNumberColumn(col: Column): col is INumberColumn & Column;
export function isNumberColumn(col: IColumnDesc): col is INumberDesc & IColumnDesc;
export function isNumberColumn(col: Column | IColumnDesc) {
  return (col instanceof Column && typeof (<any>col).getNumber === 'function' || (!(col instanceof Column) && (<IColumnDesc>col).type.match(/(number|stack|ordinal)/) != null));
}

/**
 * save number comparison
 * @param a
 * @param b
 * @param aMissing
 * @param bMissing
 * @return {number}
 */
export function numberCompare(a: number | null, b: number | null, aMissing = false, bMissing = false) {
  aMissing = aMissing || a === null || isNaN(a);
  bMissing = bMissing || b === null || isNaN(b);
  if (aMissing) { //NaN are smaller
    return bMissing ? 0 : FIRST_IS_NAN;
  }
  if (bMissing) {
    return FIRST_IS_NAN * -1;
  }
  return a! - b!;
}

export function medianIndex(rows: IDataRow[], col: INumberColumn & Column): number {
  //return the median row
  const data = rows.map((r, i) => ({i, v: col.getNumber(r.v, r.dataIndex), m: col.isMissing(r.v, r.dataIndex)}));
  const sorted = data.filter((r) => !r.m).sort((a, b) => numberCompare(a.v, b.v));
  const index = sorted[Math.floor(sorted.length / 2.0)];
  if (index === undefined) {
    return 0; //error case
  }
  return index.i;
}
