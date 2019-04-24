import {scaleLinear, scaleLog, scalePow, scaleSqrt} from 'd3-scale';
import {similar} from '../internal';
import {IMappingFunction, IMapAbleDesc} from '.';
import {ITypeFactory, ITypedDump} from './interfaces';
import {IMappingFunctionConstructor} from './INumberColumn';

/**
 * interface of a d3 scale
 */
export interface IScale {
  (v: number): number;

  invert(r: number): number;

  domain(): number[];

  domain(domain: number[]): this;

  range(): number[];

  range(range: number[]): this;
}

function toScale(type = 'linear'): IScale {
  switch (type) {
    case 'log':
      return scaleLog().clamp(true);
    case 'sqrt':
      return scaleSqrt().clamp(true);
    case 'pow1.1':
      return scalePow().exponent(1.1).clamp(true);
    case 'pow2':
      return scalePow().exponent(2).clamp(true);
    case 'pow3':
      return scalePow().exponent(3).clamp(true);
    default:
      return scaleLinear().clamp(true);
  }
}

function isSame(a: number[], b: number[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((ai, i) => similar(ai, b[i], 0.0001));
}


function fixDomain(domain: number[], type: string) {
  if (type === 'log' && domain[0] === 0) {
    domain[0] = 0.0000001; //0 is bad
  }
  return domain;
}

/**
 * a mapping function based on a d3 scale (linear, sqrt, log)
 */
export class ScaleMappingFunction implements IMappingFunction {
  private s: IScale;
  private readonly type: string;

  constructor();
  constructor(dump: ITypedDump);
  constructor(domain: number[], type: string, range: number[]);
  constructor(domain: ITypedDump|number[] = [0, 1], type = 'linear', range: number[] = [0, 1]) {
    if (!domain || Array.isArray(domain)) {
      this.type = type;
      this.s = toScale(type).domain(fixDomain(domain || [0, 1], this.type)).range(range);
    } else {
      const dump = domain;
      this.type = dump.type;
      this.s = toScale(dump.type).domain(dump.domain).range(dump.range);
    }
  }

  get domain() {
    return this.s.domain();
  }

  set domain(domain: number[]) {
    this.s.domain(fixDomain(domain, this.type));
  }

  get range() {
    return this.s.range();
  }

  set range(range: number[]) {
    this.s.range(range);
  }

  getRange(format: (v: number) => string): [string, string] {
    return [format(this.invert(0)), format(this.invert(1))];
  }

  apply(v: number): number {
    return this.s(v);
  }

  invert(r: number) {
    return this.s.invert(r);
  }

  get scaleType() {
    return this.type;
  }

  toJSON() {
    return {
      type: this.type,
      domain: this.domain,
      range: this.range
    };
  }

  eq(other: IMappingFunction): boolean {
    if (!(other instanceof ScaleMappingFunction)) {
      return false;
    }
    const that = <ScaleMappingFunction>other;
    return that.type === this.type && isSame(this.domain, that.domain) && isSame(this.range, that.range);
  }

  clone() {
    return new ScaleMappingFunction(this.domain, this.type, this.range);
  }
}

export interface IScriptMappingFunctionContext {
  value_min: number;
  value_max: number;
  value_range: number;
  value_domain: number[];
  linear(v: number, min: number, max: number): number;
}

export interface IScriptMappingFunctionType {
  (this: IScriptMappingFunctionContext, value: number): number;
}

/**
 * a mapping function based on a custom user function using 'value' as the current value
 */
export class ScriptMappingFunction implements IMappingFunction {
  private readonly f: IScriptMappingFunctionType;
  public domain: number[];
  public readonly code: string;

  constructor();
  constructor(dump: ITypedDump);
  constructor(domain: number[], code?: string | IScriptMappingFunctionType);
  constructor(domain: ITypedDump | number[] = [0, 1], code: string | IScriptMappingFunctionType = 'return this.linear(value,this.value_min,this.value_max);') {
    if (!domain || Array.isArray(domain)) {
      this.domain = domain || [0, 1];
    } else {
      const dump = domain;
      this.domain = dump.domain;
      code = dump.code;
    }
    this.code = typeof code === 'string' ? code : code.toString();
    this.f = typeof code === 'function' ? code : <any>(new Function('value', code));
  }

  getRange(): [string, string] {
    return ['?', '?'];
  }

  apply(v: number): number {
    const min = this.domain[0],
      max = this.domain[this.domain.length - 1];
    const r = this.f.call({
      value_min: min,
      value_max: max,
      value_range: max - min,
      value_domain: this.domain.slice(),
      linear: (v: number, mi: number, ma: number) => (v - mi) / (ma - mi)
    }, v);

    if (typeof r === 'number') {
      return Math.max(Math.min(r, 1), 0);
    }
    return NaN;
  }

  toJSON() {
    return {
      type: 'script',
      code: this.code,
      domain: this.domain
    };
  }

  eq(other: IMappingFunction): boolean {
    if (!(other instanceof ScriptMappingFunction)) {
      return false;
    }
    const that = <ScriptMappingFunction>other;
    return that.code === this.code || that.f === this.f;
  }

  clone() {
    return new ScriptMappingFunction(this.domain, this.f);
  }
}

/**
 * @internal
 */
export function createMappingFunction(types: {[key: string]: IMappingFunctionConstructor}) {
  return (dump: ITypedDump | IScriptMappingFunctionType): IMappingFunction => {
    if (typeof dump === 'function') {
      return new ScriptMappingFunction([0, 1], dump);
    }
    if (!dump || !dump.type) {
      return new ScaleMappingFunction();
    }
    const type = types[dump.type];
    if (!type) {
      console.warn('invalid mapping type dump', dump);
      return new ScaleMappingFunction(dump.domain || [0, 1], 'linear', dump.range || [0, 1]);
    }
    return new type(dump);
  };
}

/** @internal */
export function restoreMapping(desc: IMapAbleDesc, factory: ITypeFactory): IMappingFunction {
  if (desc.map) {
    return factory.mappingFunction(desc.map);
  }
  return new ScaleMappingFunction(desc.domain || [0, 1], 'linear', desc.range || [0, 1]);
}


export function mappingFunctions() {
  return {
    script: ScriptMappingFunction,
    linear: ScaleMappingFunction,
    log: ScaleMappingFunction,
    'pow1.1': ScaleMappingFunction,
    pow2: ScaleMappingFunction,
    pow3: ScaleMappingFunction
  };
}
