import {scaleLinear, scaleLog, scalePow, scaleSqrt} from 'd3-scale';
import {similar} from '../internal';
import Column from './Column';
import INumberColumn, {INumberFilter} from './INumberColumn';
import {IColorMappingFunction} from './ColorMappingFunction';

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

export interface IMappingFunction {
  //new(domain: number[]);

  apply(v: number): number;

  dump(): any;

  restore(dump: any): void;

  domain: number[];

  clone(): IMappingFunction;

  eq(other: IMappingFunction): boolean;

  getRange(formatter: (v: number) => string): [string, string];

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


export interface IMapAbleColumn extends INumberColumn {
  getOriginalMapping(): IMappingFunction;

  getMapping(): IMappingFunction;

  setMapping(mapping: IMappingFunction): void;

  getColorMapping(): IColorMappingFunction;

  setColorMapping(mapping: IColorMappingFunction): void;

  getFilter(): INumberFilter;

  setFilter(value?: INumberFilter): void;

  getRange(): [string, string];
}

export function isMapAbleColumn(col: Column): col is IMapAbleColumn {
  return typeof (<IMapAbleColumn>col).getMapping === 'function';
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

  constructor(domain: number[] = [0, 1], private type = 'linear', range: number[] = [0, 1]) {

    this.s = toScale(type).domain(fixDomain(domain, this.type)).range(range);
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

  dump(): any {
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

  restore(dump: any) {
    this.type = dump.type;
    this.s = toScale(dump.type).domain(dump.domain).range(dump.range);
  }

  clone() {
    return new ScaleMappingFunction(this.domain, this.type, this.range);
  }
}

/**
 * a mapping function based on a custom user function using 'value' as the current value
 */
export class ScriptMappingFunction implements IMappingFunction {
  private f: Function;

  constructor(public domain: number[] = [0, 1], private _code: string = 'return this.linear(value,this.value_min,this.value_max);') {
    this.f = new Function('value', _code);
  }

  get code() {
    return this._code;
  }

  set code(code: string) {
    if (this._code === code) {
      return;
    }
    this._code = code;
    this.f = new Function('value', code);
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

  dump(): any {
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
    return that.code === this.code;
  }

  restore(dump: any) {
    this.code = dump.code;
    this.domain = dump.domain;
  }

  clone() {
    return new ScriptMappingFunction(this.domain, this.code);
  }
}

export interface IMapAbleDesc {
  /**
   * dump of mapping function
   */
  map?: any;
  /**
   * either map or domain should be available
   */
  domain?: [number, number];
  /**
   * @default [0,1]
   */
  range?: [number, number];

  colorMapping?: string | ((v: number)=>string) | any;
}

export function createMappingFunction(dump: any): IMappingFunction {
  if (dump.type === 'script') {
    const s = new ScriptMappingFunction();
    s.restore(dump);
    return s;
  }
  const l = new ScaleMappingFunction();
  l.restore(dump);
  return l;
}

export function restoreMapping(desc: IMapAbleDesc): IMappingFunction {
  if (desc.map) {
    return createMappingFunction(desc.map);
  }
  if (desc.domain) {
    return new ScaleMappingFunction(desc.domain, 'linear', desc.range || [0, 1]);
  }
  return new ScaleMappingFunction([0, 1], 'linear', [0, 1]);
}
