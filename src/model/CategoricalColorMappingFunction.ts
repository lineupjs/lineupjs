import {ICategory, ICategoricalColorMappingFunction} from '.';
import {DEFAULT_COLOR} from './interfaces';

/**
 * @internal
 */
export const DEFAULT_COLOR_FUNCTION: ICategoricalColorMappingFunction = {
  apply: (v) => v ? v.color : DEFAULT_COLOR,
  dump: () => null,
  clone: () => DEFAULT_COLOR_FUNCTION,
  eq: (other) => other === DEFAULT_COLOR_FUNCTION
};

export class ReplacmentColorMappingFunction implements ICategoricalColorMappingFunction {
  public readonly map: ReadonlyMap<string, string>;
  constructor(map: Map<ICategory | string, string>) {
    this.map = new Map(Array.from(map.entries()).map(([k, v]) => <[string, string]>[typeof k === 'string' ? k : k.name, v]));
  }

  apply(v: ICategory) {
    return this.map.has(v.name) ? this.map.get(v.name)! : DEFAULT_COLOR_FUNCTION.apply(v);
  }

  dump() {
    const r: any = {};
    this.map.forEach((v, k) => r[k] = v);
    return r;
  }

  clone() {
    return new ReplacmentColorMappingFunction(new Map(this.map.entries()));
  }

  eq(other: ICategoricalColorMappingFunction): boolean {
    if (!(other instanceof ReplacmentColorMappingFunction)) {
      return false;
    }
    if (other.map.size !== this.map.size) {
      return false;
    }
    return Array.from(this.map.keys()).every((k) => this.map.get(k) === other.map.get(k));
  }

  static restore(dump: any, categories: ICategory[]) {
    const lookup = new Map(categories.map((d) => <[string, ICategory]>[d.name, d]));
    const r = new Map<ICategory, string>();
    for (const key of Object.keys(dump)) {
      if (lookup.has(key)) {
        r.set(lookup.get(key)!, dump[key]);
      }
    }
    return new ReplacmentColorMappingFunction(r);
  }
}

/**
 * @internal
 */
export function restoreColorMapping(dump: any, categories: ICategory[]): ICategoricalColorMappingFunction {
  if (!dump) {
    return DEFAULT_COLOR_FUNCTION;
  }
  return ReplacmentColorMappingFunction.restore(dump, categories);
}
