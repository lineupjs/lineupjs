import type { IAdvancedBoxPlotData, IBoxPlotData, IForEachAble } from '../internal';
import Column from './Column';
import type { IArrayColumn } from './IArrayColumn';
import type { IColumnDesc, IDataRow, ITypedDump, ITypeFactory } from './interfaces';

export interface IColorMappingFunction {
  apply(v: number): string;

  toJSON(): ITypedDump | string;

  clone(): IColorMappingFunction;

  eq(other: IColorMappingFunction): boolean;
}

export interface IColorMappingFunctionConstructor {
  new (dump: ITypedDump | string, factory: ITypeFactory): IColorMappingFunction;
}

export interface IMappingFunction {
  //new(domain: number[]);

  apply(v: number): number;

  toJSON(): ITypedDump;

  domain: number[];

  clone(): IMappingFunction;

  eq(other: IMappingFunction): boolean;

  getRange(formatter: (v: number) => string): [string, string];
}

export interface IMappingFunctionConstructor {
  new (dump: ITypedDump): IMappingFunction;
}

export interface IMapAbleDesc {
  /**
   * dump of mapping function
   */
  map?: ITypedDump;
  /**
   * either map or domain should be available
   */
  domain?: [number | null, number | null];
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
  colorMapping?: string | ((v: number) => string) | ITypedDump;
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
  return (
    (col instanceof Column && typeof (col as IMapAbleColumn).getMapping === 'function') ||
    (!(col instanceof Column) &&
      isNumberColumn(col) &&
      ((col as IColumnDesc).type.startsWith('number') || (col as IColumnDesc).type.startsWith('boxplot')))
  );
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

  /**
   * The accuracy defines the deviation of values to the applied filter boundary.
   * Use an accuracy closer to 0 for columns with smaller numbers (e.g., 1e-9).
   * @default 0.001
   */
  filterAccuracy?: number;
}

/**
 * checks whether the given column or description is a number column, i.e. the value is a number
 * @param col
 * @returns {boolean}
 */
export function isNumberColumn(col: Column): col is INumberColumn;
export function isNumberColumn(col: IColumnDesc): col is INumberDesc & IColumnDesc;
export function isNumberColumn(col: Column | IColumnDesc) {
  return (
    (col instanceof Column && typeof (col as INumberColumn).getNumber === 'function') ||
    (!(col instanceof Column) && (col as IColumnDesc).type.match(/(number|stack|ordinal)/) != null)
  );
}

export enum ESortMethod {
  min = 'min',
  max = 'max',
  median = 'median',
  q1 = 'q1',
  q3 = 'q3',
}

export interface IBoxPlotColumn extends INumberColumn, IMapAbleColumn {
  getBoxPlotData(row: IDataRow): IBoxPlotData | null;

  getMapping(): IMappingFunction;

  getRawBoxPlotData(row: IDataRow): IBoxPlotData | null;

  getSortMethod(): string;

  setSortMethod(sortMethod: string): void;
}

export function isBoxPlotColumn(col: Column): col is IBoxPlotColumn {
  return typeof (col as IBoxPlotColumn).getBoxPlotData === 'function';
}

export enum EAdvancedSortMethod {
  min = 'min',
  max = 'max',
  median = 'median',
  q1 = 'q1',
  q3 = 'q3',
  mean = 'mean',
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
  return isBoxPlotColumn(col) && typeof (col as INumbersColumn).getNumbers === 'function';
}

export interface INumberFilter {
  min: number;
  max: number;
  filterMissing: boolean;
}
