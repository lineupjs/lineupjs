import {ascending, mean, median, quantile} from 'd3-array';
import {format} from 'd3-format';
import {similar} from '../internal/math';
import Column from './Column';
import {IArrayColumn} from './IArrayColumn';
import {IColumnDesc, IDataRow} from './interfaces';
import {IMapAbleColumn, IMappingFunction} from './MappingFunction';
import {FIRST_IS_NAN, isMissingValue} from './missing';


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

export interface IAdvancedBoxPlotData extends IBoxPlotData {
  readonly mean: number;
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
 * helper class to lazily compute box plotdata out of a given number array
 */
export class LazyBoxPlotData implements IAdvancedBoxPlotData {
  private _sorted: number[];
  private _outlier: number[] | null = null;
  private readonly values: number[];

  constructor(values: number[], private readonly scale?: Readonly<IMappingFunction>) {
    // filter out NaN
    this.values = values.filter((d) => !isMissingValue(d));
  }

  /**
   * lazy compute sorted array
   * @returns {number[]}
   */
  private get sorted(): number[] {
    if (this._sorted == null) {
      this._sorted = this.values.slice().sort(ascending);
    }
    return this._sorted;
  }

  private map(v: number | undefined) {
    return this.scale && v != null ? this.scale.apply(v!) : v!;
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
    const q1 = quantile(this.sorted, 0.25)!;
    const q3 = quantile(this.sorted, 0.75)!;
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

export function medianIndex(rows: IDataRow[], col: INumberColumn): number {
  //return the median row
  const data = rows.map((r, i) => ({i, v: col.getNumber(r), m: col.isMissing(r)}));
  const sorted = data.filter((r) => !r.m).sort((a, b) => numberCompare(a.v, b.v));
  const index = sorted[Math.floor(sorted.length / 2.0)];
  if (index === undefined) {
    return 0; //error case
  }
  return index.i;
}

export function groupCompare(a: IDataRow[], b: IDataRow[], col: INumberColumn, sortMethod: keyof LazyBoxPlotData) {
  const va = new LazyBoxPlotData(a.map((row) => col.getNumber(row)));
  const vb = new LazyBoxPlotData(b.map((row) => col.getNumber(row)));

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

export function isEqualFilter(a: INumberFilter, b: INumberFilter) {
  return similar(a.min, b.min, 0.001) && similar(a.max, b.max, 0.001) && a.filterMissing === b.filterMissing;
}

export function isDummyFilter(filter: INumberFilter) {
  return !filter.filterMissing && !isFinite(filter.min) && !isFinite(filter.max);
}

export function isIncluded(filter: INumberFilter | null, value: number) {
  if (!filter) {
    return true;
  }
  if (isNaN(value)) {
    return !filter.filterMissing;
  }
  return !((isFinite(filter.min) && value < filter.min) || (isFinite(filter.max) && value > filter.max));
}

export function restoreFilter(v: INumberFilter): INumberFilter {
  return {
    min: v.min != null && isFinite(v.min) ? v.min : -Infinity,
    max: v.max != null && isFinite(v.max) ? v.max : +Infinity,
    filterMissing: v.filterMissing
  };
}
