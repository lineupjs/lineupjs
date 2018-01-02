import Column, {IColumnDesc} from './Column';
import {IDataRow} from './interfaces';
import {IValueColumnDesc} from './ValueColumn';

export interface IBaseCategoricalDesc {
  /**
   * separator to split  multi value
   * @defualt ;
   */
  separator?: string;

  categories: (string | ICategory)[];
}

export declare type ICategoricalDesc = IValueColumnDesc<string> & IBaseCategoricalDesc;

export interface ICategoricalColumn {
  readonly categories: string[];
  readonly categoryLabels: string[];
  readonly categoryColors: string[];

  getCategories(row: IDataRow): string[];

  getColor(row: IDataRow): string | null;
}

export interface ICategory {
  name: string;

  /**
   * optional label of this category (the one to render)
   */
  label?: string;
  /**
   * associated value with this category
   */
  value?: any;
  /**
   * category color
   * @default next in d3 color 10 range
   */
  color?: string;
}

/**
 * checks whether the given column or description is a categorical column, i.e. the value is a list of categories
 * @param col
 * @returns {boolean}
 */
export function isCategoricalColumn(col: Column): col is ICategoricalColumn & Column;
export function isCategoricalColumn(col: IColumnDesc): col is ICategoricalDesc;
export function isCategoricalColumn(col: Column | IColumnDesc) {
  return (col instanceof Column && typeof (<any>col).getCategories === 'function' || (!(col instanceof Column) && (<IColumnDesc>col).type.match(/(categorical|ordinal|hierarchy)/) != null));
}

export interface ICategoricalFilter {
  filter: string[] | string | RegExp;
  filterMissing: boolean;
}

export function isEqualFilter(a: ICategoricalFilter | null, b: ICategoricalFilter | null) {
  if (a === b) {
    return true;
  }
  if (a == null || b == null) {
    return false;
  }
  if (a.filterMissing !== b.filterMissing || (typeof a.filter !== typeof b.filter)) {
    return false;
  }
  if (Array.isArray(a.filter)) {
    return arrayEquals(<string[]>a.filter, <string[]>b.filter);
  }
  return String(a.filter) === String(b.filter);
}

function arrayEquals<T>(a: T[], b: T[]) {
  const al = a != null ? a.length : 0;
  const bl = b != null ? b.length : 0;
  if (al !== bl) {
    return false;
  }
  if (al === 0) {
    return true;
  }
  return a.every((ai, i) => ai === b[i]);
}

export function isIncluded(filter: ICategoricalFilter | null, category: string) {
  if (!filter) {
    return true;
  }
  if (category == null && filter.filterMissing) {
    return false;
  }
  const filterObj = filter.filter;
  if (Array.isArray(filterObj)) { //array mode
    return filterObj.indexOf(category) >= 0;
  }
  if (typeof filterObj === 'string' && filterObj.length > 0) { //search mode
    return category != null && category.toLowerCase().indexOf(filterObj.toLowerCase()) >= 0;
  }
  if (filterObj instanceof RegExp) { //regex match mode
    return category != null && filterObj.test(category);
  }
  return true;
}
