import Column from './Column';
import {IArrayColumn, isArrayColumn} from './IArrayColumn';
import {IColumnDesc, IDataRow} from './interfaces';
import {colorPool} from './internal';
import {FIRST_IS_MISSING} from './missing';
import {IValueColumnDesc} from './ValueColumn';

export interface ICategoricalDesc {
  categories: (string | Partial<ICategory>)[];
  missingCategory: (string | Partial<ICategory>);
}

export declare type ICategoricalColumnDesc = IValueColumnDesc<string> & ICategoricalDesc;

export interface ISetColumn extends IArrayColumn<boolean> {
  readonly categories: ICategory[];

  getSet(row: IDataRow): Set<ICategory>;
}

export function isSetColumn(col: Column): col is ISetColumn {
  return isArrayColumn(col) && Array.isArray((<ISetColumn>col).categories);
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

/** @internal */
export function toCategory(cat: (string | Partial<ICategory>), value: number, nextColor: () => string = () => Column.DEFAULT_COLOR) {
  if (typeof cat === 'string') {
    //just the category value
    return {name: cat, label: cat, color: nextColor(), value};
  }
  const name = cat.name == null ? String(cat.value) : cat.name;
  return {
    name,
    label: cat.label || name,
    color: cat.color || nextColor(),
    value: cat.value != null ? cat.value : value
  };
}

export function compareCategory(a: ICategory | null, b: ICategory | null) {
  const aNull = a == null || isNaN(a.value);
  const bNull = b == null || isNaN(b.value);
  if (aNull || a == null) {
    return bNull ? 0 : FIRST_IS_MISSING;
  }
  if (bNull || b == null) {
    return -FIRST_IS_MISSING;
  }
  if (a.value === b.value) {
    return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
  }
  return a.value - b.value;
}

export function toCategories(desc: ICategoricalDesc) {
  if (!desc.categories) {
    return [];
  }
  const nextColor = colorPool();
  const l = desc.categories.length - 1;
  const cats = desc.categories.map((cat, i) => toCategory(cat, i / l, nextColor));
  return cats.sort(compareCategory);
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

export interface ICategoricalFilter {
  filter: string[] | string | RegExp;
  filterMissing: boolean;
}

function isEmptyFilter(f: ICategoricalFilter | null) {
  return f == null || (!f.filterMissing && (f.filter == null || f.filter === ''));
}

export function isEqualCategoricalFilter(a: ICategoricalFilter | null, b: ICategoricalFilter | null) {
  if (a === b) {
    return true;
  }
  if (a == null || b == null) {
    return isEmptyFilter(a) === isEmptyFilter(b);
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

export function isCategoryIncluded(filter: ICategoricalFilter | null, category: ICategory | null) {
  if (filter == null) {
    return true;
  }
  if (category == null || isNaN(category.value)) {
    return !filter.filterMissing;
  }
  const filterObj = filter.filter;
  if (Array.isArray(filterObj)) { //array mode
    return filterObj.includes(category.name);
  }
  if (typeof filterObj === 'string' && filterObj.length > 0) { //search mode
    return category.name.toLowerCase().includes(filterObj.toLowerCase());
  }
  if (filterObj instanceof RegExp) { //regex match mode
    return filterObj.test(category.name);
  }
  return true;
}
