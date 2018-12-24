import 'reflect-metadata';
import Column from './Column';
import {IColumnDesc} from './interfaces';

const supportType = Symbol.for('SupportType');
const category = Symbol.for('Category');

export function SupportType() {
  return Reflect.metadata(supportType, true);
}

export function SortByDefault(order: 'ascending'|'descending' = 'ascending') {
  if (order === 'descending') {
    return Reflect.metadata(Symbol.for('sortDescendingByDefault'), true);
  }
  return (d: any) => d;
}

export function isSortingAscByDefault(col: Column) {
  const clazz = (<any>col).constructor;
  return !Reflect.hasMetadata(Symbol.for('sortDescendingByDefault'), clazz);
}

export class Categories {
  readonly string = {label: 'label', order: 1, name: 'string', featureLevel: 'basic'};
  readonly categorical = {label: 'categorical', order: 2, name: 'categorical', featureLevel: 'basic'};
  readonly number = {label: 'numerical', order: 3, name: 'number', featureLevel: 'basic'};
  readonly date = {label: 'date', order: 4, name: 'date', featureLevel: 'basic'};
  readonly array = {label: 'matrix', order: 5, name: 'array', featureLevel: 'advanced'};
  readonly map = {label: 'map', order: 6, name: 'map', featureLevel: 'advanced'};
  readonly composite = {label: 'combined', order: 7, name: 'composite', featureLevel: 'advanced'};
  readonly support = {label: 'support', order: 8, name: 'support', featureLevel: 'advanced'};
  readonly other = {label: 'others', order: 9, name: 'other', featureLevel: 'advanced'};
}

export const categories = new Categories();

export function Category(cat: keyof Categories) {
  return Reflect.metadata(category, cat);
}

export function getSortType(col: Column): 'abc'|'num'|undefined {
  const cat = categoryOf(col);
  const type = col.desc.type;
  if (cat === categories.string || cat === categories.categorical) {
    return 'abc';
  }
  if (cat === categories.number || type === 'rank' || isSortingAscByDefault(col)) {
    return 'num';
  }
  const numbers = new Set(['rank', 'number', 'numbers', 'ordinal', 'boxplot', 'script', 'reduce', 'stack']);
  return numbers.has(type) ? 'num' : undefined;
}

export function toolbar(...keys: string[]) {
  return Reflect.metadata(Symbol.for('toolbarIcon'), keys);
}

export function dialogAddons(key: string, ...keys: string[]) {
  return Reflect.metadata(Symbol.for(`toolbarDialogAddon${key}`), keys);
}

export function isSupportType(col: Column) {
  const clazz = (<any>col).constructor;
  return Reflect.hasMetadata(supportType, clazz);
}

export interface IColumnCategory {
  label: string;
  name: string;
  order: number;
  featureLevel: 'basic' | 'advanced';
}

export function categoryOf(col: (typeof Column) | Column): IColumnCategory {
  const cat = <keyof Categories>Reflect.getMetadata(category, col instanceof Column ? Object.getPrototypeOf(col).constructor : col) || 'other';
  return <IColumnCategory>categories[cat] || categories.other;
}

export function categoryOfDesc(col: IColumnDesc | string, models: { [key: string]: typeof Column }): IColumnCategory {
  const type = typeof col === 'string' ? col : col.type;
  const clazz = models[type];
  return clazz ? categoryOf(clazz) : <IColumnCategory>categories.other;
}
