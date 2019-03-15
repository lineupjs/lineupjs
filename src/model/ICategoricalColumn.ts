import {IForEachAble} from '../internal';
import Column from './Column';
import {IArrayColumn, isArrayColumn} from './IArrayColumn';
import {IValueColumnDesc, IColumnDesc, IDataRow, ITypedDump} from './interfaces';

export interface ICategoricalDesc {
  categories: (string | Partial<ICategory>)[];
}

export declare type ICategoricalColumnDesc = IValueColumnDesc<string> & ICategoricalDesc;

export interface ICategoricalColorMappingFunction {
  apply(v: ICategory): string;

  toJSON(): ITypedDump | null;

  clone(): ICategoricalColorMappingFunction;

  eq(other: ICategoricalColorMappingFunction): boolean;
}

export interface ICategoricalColorMappingFunctionConstructor {
  new(dump: ITypedDump): ICategoricalColorMappingFunction;
}

export interface ICategoricalLikeColumn extends Column {
  readonly categories: ICategory[];

  getColorMapping(): ICategoricalColorMappingFunction;
  setColorMapping(mapping: ICategoricalColorMappingFunction): void;

  iterCategory(row: IDataRow): IForEachAble<ICategory | null>;

  getCategories(row: IDataRow): (ICategory | null)[];
}

export function isCategoricalLikeColumn(col: Column): col is ICategoricalLikeColumn {
  return typeof (<ICategoricalLikeColumn>col).categories !== 'undefined' && typeof (<ICategoricalLikeColumn>col).iterCategory === 'function';
}

export interface ISetColumn extends IArrayColumn<boolean>, ICategoricalLikeColumn {
  getSet(row: IDataRow): Set<ICategory>;
}

export function isSetColumn(col: Column): col is ISetColumn {
  return isCategoricalLikeColumn(col) && typeof (<ISetColumn>col).getSet === 'function';
}

export interface ICategoricalColumn extends ISetColumn {
  getCategory(row: IDataRow): ICategory | null;
}

export interface ICategory {
  readonly name: string;

  /**
   * optional label of this category (the one to render)
   */
  readonly label: string;
  /**
   * category color
   * @default next in d3 color 10 range
   */
  readonly color: string;

  value: number;
}
/**
 * checks whether the given column or description is a categorical column, i.e. the value is a list of categories
 * @param col
 * @returns {boolean}
 */
export function isCategoricalColumn(col: Column): col is ICategoricalColumn;
export function isCategoricalColumn(col: IColumnDesc): col is ICategoricalColumnDesc & IColumnDesc;
export function isCategoricalColumn(col: Column | IColumnDesc) {
  return (col instanceof Column && typeof (<ICategoricalColumn>col).getCategory === 'function' || (!(col instanceof Column) && (<IColumnDesc>col).type.match(/(categorical|ordinal|hierarchy)/) != null));
}

export declare type ICategoricalsColumn = ICategoricalLikeColumn & IArrayColumn<string | null>;

export function isCategoricalsColumn(col: Column): col is ICategoricalsColumn {
  return isCategoricalLikeColumn(col) && isArrayColumn(col) && !isSetColumn(col);
}


export interface ICategoricalFilter {
  filter: string[] | string | RegExp;
  filterMissing: boolean;
}


export function isCategory(v: any): v is ICategory {
  return typeof v.name === 'string' && typeof v.label === 'string' && typeof v.color === 'string' && typeof v.value === 'number';
}
