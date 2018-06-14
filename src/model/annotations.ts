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
  readonly string = {label: 'label', order: 1, name: 'string'};
  readonly categorical = {label: 'categorical', order: 2, name: 'categorical'};
  readonly number = {label: 'numerical', order: 3, name: 'number'};
  readonly date = {label: 'date', order: 4, name: 'date'};
  readonly array = {label: 'matrix', order: 5, name: 'array'};
  readonly map = {label: 'map', order: 6, name: 'map'};
  readonly composite = {label: 'combined', order: 7, name: 'composite'};
  readonly support = {label: 'support', order: 8, name: 'support'};
  readonly other = {label: 'others', order: 9, name: 'other'};
}

export const categories = new Categories();

export function Category(cat: keyof Categories) {
  return Reflect.metadata(category, cat);
}

export function toolbar(...keys: string[]) {
  return Reflect.metadata(Symbol.for('toolbarIcon'), keys);
}

export function dialogAddons(key: string, ...keys: string[]) {
  return Reflect.metadata(Symbol.for(`toolbarDialogAddon${key}`), keys);
}

const cache = new Map<string, string[]>();

export function isSupportType(col: Column) {
  const clazz = (<any>col).constructor;
  return Reflect.hasMetadata(supportType, clazz);
}

export function categoryOf(col: (typeof Column) | Column) {
  const cat = <keyof Categories>Reflect.getMetadata(category, col instanceof Column ? Object.getPrototypeOf(col).constructor : col) || 'other';
  return categories[cat] || categories.other;
}

export function categoryOfDesc(col: IColumnDesc | string, models: { [key: string]: typeof Column }) {
  const type = typeof col === 'string' ? col : col.type;
  const clazz = models[type];
  return clazz ? categoryOf(clazz) : categories.other;
}

export function getAllToolbarActions(col: Column) {
  if (cache.has(col.desc.type)) {
    return cache.get(col.desc.type)!;
  }
  const actions = <string[]>[];

  // walk up the prototype chain
  let obj = <any>col;
  const toolbarIcon = Symbol.for('toolbarIcon');
  do {
    const m = <string[]>Reflect.getOwnMetadata(toolbarIcon, obj.constructor);
    if (m) {
      actions.push(...m);
    }
    obj = Object.getPrototypeOf(obj);
  } while (obj);
  cache.set(col.desc.type, actions);
  return actions;
}


export function getAllToolbarDialogAddons(col: Column, key: string) {
  const cacheKey = `${col.desc.type}@${key}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }
  const actions = <string[]>[];

  // walk up the prototype chain
  let obj = <any>col;
  const symbol = Symbol.for(`toolbarDialogAddon${key}`);
  do {
    const m = <string[]>Reflect.getOwnMetadata(symbol, obj.constructor);
    if (m) {
      actions.push(...m);
    }
    obj = Object.getPrototypeOf(obj);
  } while (obj);
  cache.set(cacheKey, actions);
  return actions;
}
