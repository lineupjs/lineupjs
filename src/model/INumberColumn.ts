import {IAdvancedBoxPlotData, IBoxPlotData, IForEachAble} from '../internal';
import Column from './Column';
import {IArrayColumn} from './IArrayColumn';
import {IColumnDesc, IDataRow} from './interfaces';


export interface IColorMappingFunctionBase {
  apply(v: number): string;

  dump(): any;

  clone(): IColorMappingFunction;

  eq(other: IColorMappingFunction): boolean;
}

export interface IInterpolateColorMappingFunction extends IColorMappingFunctionBase {
  type: 'sequential' | 'divergent';
  name: string;
}

export interface IQuantizedColorMappingFunction extends IColorMappingFunctionBase {
  type: 'quantized';
  base: IColorMappingFunction;
  steps: number;
}

export interface ISolidColorMappingFunction extends IColorMappingFunctionBase {
  type: 'solid';
  color: string;
}

export interface ICustomColorMappingFunction extends IColorMappingFunctionBase {
  type: 'custom';
  entries: {value: number, color: string}[];
}

export declare type IColorMappingFunction = ISolidColorMappingFunction | ICustomColorMappingFunction | IQuantizedColorMappingFunction | IInterpolateColorMappingFunction;


export interface IMappingFunction {
  //new(domain: number[]);

  apply(v: number): number;

  dump(): any;

  restore(dump: any): void;

  domain: number[];

  clone(): IMappingFunction;

  eq(other: IMappingFunction): boolean;

  getRange(formatter: (v: number) => string): [string, string];
}


export interface IMapAbleDesc {
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
   * @deprecated use colorMapping instead
   */
  color?: string;

  /**
   * color mapping
   */
  colorMapping?: string | ((v: number) => string) | any;
}


export interface IMapAbleColumn extends INumberColumn {
  getOriginalMapping(): IMappingFunction;

  getMapping(): IMappingFunction;

  setMapping(mapping: IMappingFunction): void;

  getColorMapping(): IColorMappingFunction;

  setColorMapping(mapping: IColorMappingFunction): void;

  getFilter(): INumberFilter;

  setFilter(value: INumberFilter | null): void;

  getRange(): [string, string];
}

export function isMapAbleColumn(col: Column): col is IMapAbleColumn;
export function isMapAbleColumn(col: IColumnDesc): col is IMapAbleDesc & IColumnDesc;
export function isMapAbleColumn(col: Column | IColumnDesc) {
  return (col instanceof Column && typeof (<IMapAbleColumn>col).getMapping === 'function' || (!(col instanceof Column) && isNumberColumn(col) && ((<IColumnDesc>col).type.startsWith('number') || (<IColumnDesc>col).type.startsWith('boxplot'))));
}


export interface INumberColumn extends Column {
  getNumber(row: IDataRow): number;

  getRawNumber(row: IDataRow): number;

  iterNumber(row: IDataRow): IForEachAble<number>;
  iterRawNumber(row: IDataRow): IForEachAble<number>;

  getNumberFormat(): (v: number) => string;
}

export interface INumberDesc extends IMapAbleDesc {
  /**
   * d3 formatting option
   * @default .3n
   */
  numberFormat?: string;
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


export interface INumberFilter {
  min: number;
  max: number;
  filterMissing: boolean;
}
