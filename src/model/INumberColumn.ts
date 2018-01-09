import {format} from 'd3-format';
import {IAdvancedBoxPlotData, IBoxPlotData, similar} from '../internal';
import Column from './Column';
import {IArrayColumn} from './IArrayColumn';
import {IColumnDesc, IDataRow} from './interfaces';
import {IMapAbleColumn, IMappingFunction} from './MappingFunction';
import {FIRST_IS_NAN} from './missing';

export {} from '../internal';


export interface INumberColumn extends Column {
  getNumber(row: IDataRow): number;

  getRawNumber(row: IDataRow): number;
}


export const DEFAULT_FORMATTER = format('.3n');

export default INumberColumn;


export interface INumberDesc {
  /**
   * dump of mapping function
   */
  map?: any;
  /**
   * either map or domain should be available
   */
  domain?: [number, number];
  /**
   * @default [0,1]
   */
  range?: [number, number];
  /**
   * d3 formatting option
   * @default .3n
   */
  numberFormat?: string;

  /**
   * missing value to use
   * @default 0
   */
  missingValue?: number;
}

/**
 * checks whether the given column or description is a number column, i.e. the value is a number
 * @param col
 * @returns {boolean}
 */
export function isNumberColumn(col: Column): col is INumberColumn;
export function isNumberColumn(col: IColumnDesc): col is INumberDesc & IColumnDesc;
export function isNumberColumn(col: Column | IColumnDesc) {
  return (col instanceof Column && typeof (<INumberColumn>col).getNumber === 'function' || (!(col instanceof Column) && (<IColumnDesc>col).type.match(/(number|stack|ordinal)/) != null));
}

export function compareBoxPlot(col: IBoxPlotColumn, a: IDataRow, b: IDataRow) {
  const aVal = col.getBoxPlotData(a);
  const bVal = col.getBoxPlotData(b);
  if (aVal == null) {
    return bVal == null ? 0 : FIRST_IS_NAN;
  }
  if (bVal == null) {
    return FIRST_IS_NAN * -1;
  }
  const method = <keyof IBoxPlotData>col.getSortMethod();
  return numberCompare(<number>aVal[method], <number>bVal[method]);
}

export function getBoxPlotNumber(col: IBoxPlotColumn, row: IDataRow, mode: 'raw' | 'normalized'): number {
  const data = mode === 'normalized' ? col.getBoxPlotData(row) : col.getRawBoxPlotData(row);
  if (data == null) {
    return NaN;
  }
  return <number>data[<keyof IBoxPlotData>col.getSortMethod()];
}

export enum ESortMethod {
  min = 'min',
  max = 'max',
  median = 'median',
  q1 = 'q1',
  q3 = 'q3'
}

export interface IBoxPlotColumn extends INumberColumn, IMapAbleColumn {
  getBoxPlotData(row: IDataRow): IBoxPlotData | null;

  getMapping(): IMappingFunction;

  getRawBoxPlotData(row: IDataRow): IBoxPlotData | null;

  getSortMethod(): string;

  setSortMethod(sortMethod: string): void;
}

export function isBoxPlotColumn(col: Column): col is IBoxPlotColumn {
  return typeof (<IBoxPlotColumn>col).getBoxPlotData === 'function';
}

export enum EAdvancedSortMethod {
  min = 'min',
  max = 'max',
  median = 'median',
  q1 = 'q1',
  q3 = 'q3',
  mean = 'mean'
}

export interface IAdvancedBoxPlotColumn extends IBoxPlotColumn {
  getBoxPlotData(row: IDataRow): IAdvancedBoxPlotData | null;

  getRawBoxPlotData(row: IDataRow): IAdvancedBoxPlotData | null;
}

export interface INumbersColumn extends IAdvancedBoxPlotColumn, IArrayColumn<number> {
  getNumbers(row: IDataRow): number[];

  getRawNumbers(row: IDataRow): number[];
}

export function isNumbersColumn(col: Column): col is INumbersColumn {
  return isBoxPlotColumn(col) && typeof (<INumbersColumn>col).getNumbers === 'function';
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
  aMissing = aMissing || a == null || isNaN(a);
  bMissing = bMissing || b == null || isNaN(b);
  if (aMissing) { //NaN are smaller
    return bMissing ? 0 : FIRST_IS_NAN;
  }
  if (bMissing) {
    return FIRST_IS_NAN * -1;
  }
  return a! - b!;
}

export interface INumberFilter {
  min: number;
  max: number;
  filterMissing: boolean;
}

export function noNumberFilter() {
  return ({min: -Infinity, max: Infinity, filterMissing: false});
}

export function isEqualNumberFilter(a: INumberFilter, b: INumberFilter) {
  return similar(a.min, b.min, 0.001) && similar(a.max, b.max, 0.001) && a.filterMissing === b.filterMissing;
}

export function isNumberIncluded(filter: INumberFilter | null, value: number) {
  if (!filter) {
    return true;
  }
  if (isNaN(value)) {
    return !filter.filterMissing;
  }
  return !((isFinite(filter.min) && value < filter.min) || (isFinite(filter.max) && value > filter.max));
}
