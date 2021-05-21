import type { ICategory, ICategoricalColorMappingFunction } from './ICategoricalColumn';
import type { ITypedDump } from './interfaces';
import { DEFAULT_COLOR } from './Column';

export const DEFAULT_CATEGORICAL_COLOR_FUNCTION: ICategoricalColorMappingFunction = {
  apply: (v) => (v ? v.color : DEFAULT_COLOR),
  toJSON: () => null,
  clone: () => DEFAULT_CATEGORICAL_COLOR_FUNCTION,
  eq: (other) => other === DEFAULT_CATEGORICAL_COLOR_FUNCTION,
};

export class ReplacementColorMappingFunction implements ICategoricalColorMappingFunction {
  public readonly map: ReadonlyMap<string, string>;
  constructor(map: Map<ICategory | string, string>) {
    this.map = new Map(
      Array.from(map.entries()).map(([k, v]) => [typeof k === 'string' ? k : k.name, v] as [string, string])
    );
  }

  apply(v: ICategory) {
    return this.map.has(v.name) ? this.map.get(v.name)! : DEFAULT_CATEGORICAL_COLOR_FUNCTION.apply(v);
  }

  toJSON() {
    const r: any = {};
    this.map.forEach((v, k) => (r[k] = v));
    return {
      type: 'replace',
      map: r,
    };
  }

  clone() {
    return new ReplacementColorMappingFunction(new Map(this.map.entries()));
  }

  eq(other: ICategoricalColorMappingFunction): boolean {
    if (!(other instanceof ReplacementColorMappingFunction)) {
      return false;
    }
    if (other.map.size !== this.map.size) {
      return false;
    }
    return Array.from(this.map.keys()).every((k) => this.map.get(k) === other.map.get(k));
  }

  static restore(dump: any, categories: ICategory[]) {
    if (dump.type === 'replace') {
      // new dump format
      dump = dump.map;
    }
    const lookup = new Map(categories.map((d) => [d.name, d]));
    const r = new Map<ICategory, string>();
    for (const key of Object.keys(dump)) {
      if (lookup.has(key)) {
        r.set(lookup.get(key)!, dump[key]);
      }
    }
    return new ReplacementColorMappingFunction(r);
  }
}

/**
 * @internal
 */
export function restoreCategoricalColorMapping(
  dump: ITypedDump | null | undefined,
  categories: ICategory[]
): ICategoricalColorMappingFunction {
  if (!dump) {
    return DEFAULT_CATEGORICAL_COLOR_FUNCTION;
  }
  return ReplacementColorMappingFunction.restore(dump, categories);
}
