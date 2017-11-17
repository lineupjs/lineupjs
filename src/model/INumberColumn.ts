import {FIRST_IS_NAN, isMissingValue} from './missing';
import Column, {IColumnDesc} from './Column';
import {IDataRow} from '../provider/ADataProvider';
import {ascending, format, mean, median, quantile} from 'd3';
import {IMappingFunction} from './NumberColumn';
import {similar} from '../utils';


export interface INumberColumn {
  getNumber(row: any, index: number): number;

  getRawNumber(row: any, index: number): number;
}

export const DEFAULT_FORMATTER = format('.3n');

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

export interface IBoxPlotData {
  readonly min: number;
  readonly max: number;
  readonly median: number;
  readonly q1: number;
  readonly q3: number;
  readonly outlier?: number[];
}

export function compareBoxPlot(col: IBoxPlotColumn, a: any, b: any, aIndex: number, bIndex: number) {
  const aVal = col.getBoxPlotData(a, aIndex);
  const bVal = col.getBoxPlotData(b, bIndex);
  if (aVal === null) {
    return bVal === null ? 0 : FIRST_IS_NAN;
  }
  if (bVal === null) {
    return FIRST_IS_NAN * -1;
  }
  const method = <keyof IBoxPlotData>col.getSortMethod();
  return numberCompare(<number>aVal[method], <number>bVal[method]);
}

export function getBoxPlotNumber(col: IBoxPlotColumn, row: any, index: number, mode: 'raw' | 'normalized'): number {
  const data = mode === 'normalized' ? col.getBoxPlotData(row, index) : col.getRawBoxPlotData(row, index);
  if (data === null) {
    return NaN;
  }
  return <number>data[<keyof IBoxPlotData>col.getSortMethod()];
}

export const SORT_METHOD = {
  min: 'min',
  max: 'max',
  median: 'median',
  q1: 'q1',
  q3: 'q3'
};

// till it can be more specific
export declare type SortMethod = string;


export interface IBoxPlotColumn extends INumberColumn {
  getBoxPlotData(row: any, index: number): IBoxPlotData | null;

  getMapping(): IMappingFunction;

  getRawBoxPlotData(row: any, index: number): IBoxPlotData | null;

  getSortMethod(): string;

  setSortMethod(sortMethod: string): void;
}

export interface IAdvancedBoxPlotData extends IBoxPlotData {
  readonly mean: number;
}

export const ADVANCED_SORT_METHOD = Object.assign({
  mean: 'mean'
}, SORT_METHOD);

export interface IAdvancedBoxPlotColumn extends IBoxPlotColumn {
  getBoxPlotData(row: any, index: number): IAdvancedBoxPlotData | null;

  getRawBoxPlotData(row: any, index: number): IAdvancedBoxPlotData | null;
}

/**
 * helper class to lazily compute box plotdata out of a given number array
 */
export class LazyBoxPlotData implements IAdvancedBoxPlotData {
  private _sorted: number[] | null = null;
  private _outlier: number[] | null = null;
  private readonly values: number[];

  constructor(values: number[], private readonly scale?: IMappingFunction) {
    // filter out NaN
    this.values = values.filter((d) => !isMissingValue(d));
  }

  /**
   * lazy compute sorted array
   * @returns {number[]}
   */
  private get sorted() {
    if (this._sorted === null) {
      this._sorted = this.values.slice().sort(ascending);
    }
    return this._sorted;
  }

  private map(v: number) {
    return this.scale ? this.scale.apply(v) : v;
  }

  get min() {
    return this.map(Math.min(...this.values));
  }

  get max() {
    return this.map(Math.max(...this.values));
  }

  get median() {
    return this.map(median(this.sorted));
  }

  get q1() {
    return this.map(quantile(this.sorted, 0.25));
  }

  get q3() {
    return this.map(quantile(this.sorted, 0.75));
  }

  get mean() {
    return this.map(mean(this.values));
  }

  get outlier() {
    if (this._outlier) {
      return this._outlier;
    }
    const q1 = quantile(this.sorted, 0.25);
    const q3 = quantile(this.sorted, 0.75);
    const iqr = q3 - q1;
    const left = q1 - 1.5 * iqr;
    const right = q3 + 1.5 * iqr;
    this._outlier = this.sorted.filter((v) => (v < left || v > right) && !isMissingValue(v));
    if (this.scale) {
      this._outlier = this._outlier.map((v) => this.scale!.apply(v));
    }
    return this._outlier;

  }
}

export interface INumbersColumn extends INumberColumn {
  getNumbers(row: any, index: number): number[];

  getRawNumbers(row: any, index: number): number[];

  getDataLength(): number;

  getColorRange(): string[];

  getRawColorScale(): (v: number) => string;

  getThreshold(): number;

  getMapping(): IMappingFunction;
}

export function isNumbersColumn(col: any): col is INumbersColumn {
  return (<INumbersColumn>col).getNumbers !== undefined && isNumberColumn(col);
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

export function groupCompare(a: IDataRow[], b: IDataRow[], col: INumberColumn & Column, sortMethod: keyof LazyBoxPlotData) {
  const va = new LazyBoxPlotData(a.map((row) => col.getNumber(row.v, row.dataIndex)));
  const vb = new LazyBoxPlotData(b.map((row) => col.getNumber(row.v, row.dataIndex)));
  return numberCompare(<number>va[sortMethod], <number>vb[sortMethod]);
}


export interface INumberFilter {
  min: number;
  max: number;
  filterMissing: boolean;
}

export function noNumberFilter() {
  return ({min: -Infinity, max: Infinity, filterMissing: false});
}

export function isSameFilter(a: INumberFilter, b: INumberFilter) {
  return similar(a.min, b.min, 0.001) && similar(a.max, b.max, 0.001) && a.filterMissing === b.filterMissing;
}

export function restoreFilter(v: INumberFilter): INumberFilter {
  return {
    min: v.min !== null && isFinite(v.min) ? v.min : -Infinity,
    max: v.max !== null && isFinite(v.max) ? v.max : +Infinity,
    filterMissing: v.filterMissing
  };
}
