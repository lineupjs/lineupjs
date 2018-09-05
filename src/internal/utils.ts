import * as equalImpl from 'fast-deep-equal';

export const equal: (a: any, b: any) => boolean = (typeof equalImpl === 'function' ? equalImpl : (<any>equalImpl).default);

/** @internal */
export function findOption(options: any) {
  return (key: string, defaultValue: any): any => {
    if (key in options) {
      return options[key];
    }
    if (key.indexOf('.') > 0) {
      const p = key.substring(0, key.indexOf('.'));
      key = key.substring(key.indexOf('.') + 1);
      if (p in options && key in options[p]) {
        return options[p][key];
      }
    }
    return defaultValue;
  };
}

/** @internal */
export function equalArrays<T>(a: T[], b: T[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((ai, i) => ai === b[i]);
}


/**
 * converts a given id to css compatible one
 * @param id
 * @return {string|void}
 * @internal
 */
export function fixCSS(id: string) {
  return id.replace(/[\s!#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]+/g, '_'); //replace non css stuff to _
}
