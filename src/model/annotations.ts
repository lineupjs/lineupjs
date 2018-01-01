import 'reflect-metadata';
import Column from './Column';

const supportType = Symbol.for('SupportType');

export function SupportType() {
  return Reflect.metadata(supportType, true);
}

export function toolbar(...keys: string[]) {
  return Reflect.metadata(Symbol.for('toolbarIcon'), keys);
}

const cache = new Map<string, string[]>();

export function isSupportType(col: Column) {
  const clazz = (<any>col).constructor;
  return Reflect.hasMetadata(supportType, clazz);
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
