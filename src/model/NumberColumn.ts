/**
 * Created by sam on 04.11.2016.
 */

import {scale, format} from 'd3';
import Column, {IColumnDesc, IStatistics} from './Column';
import ValueColumn from './ValueColumn';


/**
 * checks whether the given column or description is a number column, i.e. the value is a number
 * @param col
 * @returns {boolean}
 */
export function isNumberColumn(col: Column|IColumnDesc) {
  return (col instanceof Column && typeof (<any>col).getNumber === 'function' || (!(col instanceof Column) && (<IColumnDesc>col).type.match(/(number|stack|ordinal)/) != null));
}

function isMissingValue(v: any) {
  return typeof(v) === 'undefined' || v == null || isNaN(v) || v === '' || v === 'NA' || (typeof(v) === 'string' && (v.toLowerCase() === 'na'));
}

/**
 * save number comparison
 * @param a
 * @param b
 * @return {number}
 */
export function numberCompare(a: number, b: number) {
  if (isNaN(a)) { //NaN are bigger
    return isNaN(b) ? 0 : +1;
  }
  if (isNaN(b)) {
    return -1;
  }
  return a - b;
}


export interface INumberColumn {
  getNumber(row: any): number;
}

/**
 * interface of a d3 scale
 */
export interface IScale {
  (v: number): number;

  domain(): number[];
  domain(domain: number[]);

  range(): number[];
  range(range: number[]);
}

export interface IMappingFunction {
  //new(domain: number[]);

  apply(v: number): number;

  dump(): any;
  restore(dump: any);

  domain: number[];

  clone(): IMappingFunction;

  eq(other: IMappingFunction): boolean;

}

export interface INumberFilter {
  min: number;
  max: number;
  filterMissing: boolean;
}

function toScale(type = 'linear'): IScale {
  switch (type) {
    case 'log':
      return scale.log().clamp(true);
    case 'sqrt':
      return scale.sqrt().clamp(true);
    case 'pow1.1':
      return scale.pow().exponent(1.1).clamp(true);
    case 'pow2':
      return scale.pow().exponent(2).clamp(true);
    case 'pow3':
      return scale.pow().exponent(3).clamp(true);
    default:
      return scale.linear().clamp(true);
  }
}

function isSame(a: number[], b: number[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((ai, i) => ai === b[i]);
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

  apply(v: number): number {
    return this.s(v);
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

  eq(other: IMappingFunction) {
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

  constructor(private domain_: number[] = [0, 1], private code_: string = 'return this.linear(value,this.value_min,this.value_max);') {
    this.f = new Function('value', code_);
  }

  get domain() {
    return this.domain_;
  }

  set domain(domain: number[]) {
    this.domain_ = domain;
  }

  get code() {
    return this.code_;
  }

  set code(code: string) {
    if (this.code_ === code) {
      return;
    }
    this.code_ = code;
    this.f = new Function('value', code);
  }

  apply(v: number): number {
    const min = this.domain_[0],
      max = this.domain_[this.domain_.length - 1];
    const r = this.f.call({
      value_min: min,
      value_max: max,
      value_range: max - min,
      value_domain: this.domain_.slice(),
      linear: (v, mi, ma) => (v - mi) / (ma - mi)
    }, v);

    if (typeof r === 'number') {
      return Math.max(Math.min(r, 1), 0);
    }
    return NaN;
  }

  dump(): any {
    return {
      type: 'script',
      code: this.code
    };
  }

  eq(other: IMappingFunction) {
    if (!(other instanceof ScriptMappingFunction)) {
      return false;
    }
    const that = <ScriptMappingFunction>other;
    return that.code === this.code;
  }

  restore(dump: any) {
    this.code = dump.code;
  }

  clone() {
    return new ScriptMappingFunction(this.domain, this.code);
  }
}

export function createMappingFunction(dump: any): IMappingFunction {
  if (dump.type === 'script') {
    let s = new ScriptMappingFunction();
    s.restore(dump);
    return s;
  } else {
    let l = new ScaleMappingFunction();
    l.restore(dump);
    return l;
  }
}

/**
 * a number column mapped from an original input scale to an output range
 */
export default class NumberColumn extends ValueColumn<number> implements INumberColumn {
  static EVENT_MAPPING_CHANGED = 'mappingChanged';

  static noFilter = () => ({min: -Infinity, max: Infinity, filterMissing: false});

  missingValue = 0;

  private mapping: IMappingFunction;

  private original: IMappingFunction;

  /**
   * currently active filter
   * @type {{min: number, max: number}}
   * @private
   */
  private currentFilter: INumberFilter = NumberColumn.noFilter();

  private numberFormat: (n: number) => string = format('.3n');

  constructor(id: string, desc: any) {
    super(id, desc);

    if (desc.map) {
      this.mapping = createMappingFunction(desc.map);
    } else if (desc.domain) {
      this.mapping = new ScaleMappingFunction(desc.domain, 'linear', desc.range || [0, 1]);
    }
    this.original = this.mapping.clone();

    if (desc.numberFormat) {
      this.numberFormat = format(desc.numberFormat);
    }
  }

  init(callback: (desc: IColumnDesc) => Promise<IStatistics>): Promise<boolean> {

    var d = this.mapping.domain;
    //if any of the values is not given use the statistics to compute them
    if (isNaN(d[0]) || isNaN(d[1])) {
      return callback(this.desc).then((stats) => {
        this.mapping.domain = [stats.min, stats.max];
        this.original.domain = [stats.min, stats.max];
        return true;
      });
    }
    return Promise.resolve(true);
  }

  dump(toDescRef: (desc: any) => any) {
    var r = super.dump(toDescRef);
    r.map = this.mapping.dump();
    r.filter = this.currentFilter;
    r.missingValue = this.missingValue;
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column) {
    super.restore(dump, factory);
    if (dump.map) {
      this.mapping = createMappingFunction(dump.map);
    } else if (dump.domain) {
      this.mapping = new ScaleMappingFunction(dump.domain, 'linear', dump.range || [0, 1]);
    }
    if (dump.currentFilter) {
      this.currentFilter = dump.currentFilter;
    }
    if (dump.missingValue) {
      this.missingValue = dump.missingValue;
    }
    if (dump.numberFormat) {
      this.numberFormat = format(dump.numberFormat);
    }
  }

  protected createEventList() {
    return super.createEventList().concat([NumberColumn.EVENT_MAPPING_CHANGED]);
  }

  getLabel(row: any) {
    if ((<any>this.desc).numberFormat) {
      let raw = this.getRawValue(row);
      //if a dedicated format and a number use the formatter in any case
      if (isNaN(raw)) {
        return 'NaN';
      }
      return this.numberFormat(raw);
    }
    const v = super.getValue(row);
    //keep non number if it is not a number else convert using formatter
    if (typeof v === 'number') {
      return this.numberFormat(+v);
    }
    return String(v);
  }

  getRawValue(row: any) {
    var v: any = super.getValue(row);
    if (isMissingValue(v)) {
      return this.missingValue;
    }
    return +v;
  }

  getValue(row: any) {
    var v = this.getRawValue(row);
    if (isNaN(v)) {
      return v;
    }
    return this.mapping.apply(v);
  }

  getNumber(row: any) {
    return this.getValue(row);
  }

  compare(a: any, b: any) {
    return numberCompare(this.getValue(a), this.getValue(b));
  }

  getOriginalMapping() {
    return this.original.clone();
  }

  getMapping() {
    return this.mapping.clone();
  }

  setMapping(mapping: IMappingFunction) {
    if (this.mapping.eq(mapping)) {
      return;
    }
    this.fire([NumberColumn.EVENT_MAPPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.mapping.clone(), this.mapping = mapping);
  }

  isFiltered() {
    return this.currentFilter.filterMissing || isFinite(this.currentFilter.min) || isFinite(this.currentFilter.max);
  }

  get filterMin() {
    return this.currentFilter.min;
  }

  get filterMax() {
    return this.currentFilter.max;
  }

  get filterMissing() {
    return this.currentFilter.filterMissing;
  }

  getFilter(): INumberFilter {
    return {
      min: this.currentFilter.min,
      max: this.currentFilter.max,
      filterMissing: this.currentFilter.filterMissing
    };
  }

  set filterMin(min: number) {
    const bak = this.getFilter();
    this.currentFilter.min = isNaN(min) ? -Infinity : min;
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getFilter());
  }

  set filterMax(max: number) {
    const bak = this.getFilter();
    this.currentFilter.max = isNaN(max) ? Infinity : max;
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getFilter());
  }

  set filterMissing(filterMissing: boolean) {
    const bak = this.getFilter();
    this.currentFilter.filterMissing = filterMissing;
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getFilter());
  }

  setFilter(value: INumberFilter = {min: -Infinity, max: +Infinity, filterMissing: false}) {
    if (this.currentFilter.min === value.min && this.currentFilter.max === value.max && this.currentFilter.filterMissing === value.filterMissing) {
      return;
    }
    const bak = this.getFilter();
    this.currentFilter.min = isNaN(value.min) ? -Infinity : value.min;
    this.currentFilter.max = isNaN(value.max) ? Infinity : value.max;
    this.currentFilter.filterMissing = value.filterMissing;
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getFilter());
  }

  /**
   * filter the current row if any filter is set
   * @param row
   * @returns {boolean}
   */
  filter(row: any) {
    if (!this.isFiltered()) {
      return true;
    }
    const v: any = super.getValue(row);
    if (isMissingValue(v)) {
      return !this.filterMissing;
    }
    const vn = +v;
    return !((isFinite(this.currentFilter.min) && vn < this.currentFilter.min) || (isFinite(this.currentFilter.max) && vn > this.currentFilter.max));
  }
}
