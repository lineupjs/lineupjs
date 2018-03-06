/**
 * Created by sam on 04.11.2016.
 */

import {format, scale} from 'd3';
import Column from './Column';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import {equalArrays, similar} from '../utils';
import {isMissingValue, isUnknown, missingGroup} from './missing';
import {IGroupData} from '../ui/engine/interfaces';
import {
  default as INumberColumn, INumberDesc, numberCompare, groupCompare,
  SortMethod, ADVANCED_SORT_METHOD, INumberFilter, noNumberFilter, isSameFilter, restoreFilter
} from './INumberColumn';
import CompositeNumberColumn from './CompositeNumberColumn';

export {default as INumberColumn, isNumberColumn} from './INumberColumn';
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
      code: this.code
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
  }

  clone() {
    return new ScriptMappingFunction(this.domain, this.code);
  }
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


export declare type INumberColumnDesc = INumberDesc & IValueColumnDesc<number>;



export interface IMapAbleColumn {
  getOriginalMapping(): IMappingFunction;

  getMapping(): IMappingFunction;

  setMapping(mapping: IMappingFunction): void;

  getFilter(): INumberFilter;

  setFilter(value?: INumberFilter): void;

  getRange(): [string, string];
}

export function isMapAbleColumn(col: any): col is IMapAbleColumn {
  return typeof col.getMapping === 'function';
}

/**
 * a number column mapped from an original input scale to an output range
 */
export default class NumberColumn extends ValueColumn<number> implements INumberColumn, IMapAbleColumn {
  static readonly EVENT_MAPPING_CHANGED = 'mappingChanged';

  missingValue = NaN;

  private mapping: IMappingFunction;

  private original: IMappingFunction;

  /**
   * currently active filter
   * @type {{min: number, max: number}}
   * @private
   */
  private currentFilter: INumberFilter = noNumberFilter();

  private numberFormat: (n: number) => string = format('.2f');

  private currentStratifyThresholds: number[] = [];
  private groupSortMethod: SortMethod = ADVANCED_SORT_METHOD.median;

  constructor(id: string, desc: INumberColumnDesc) {
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

    if (desc.missingValue !== undefined) {
      this.missingValue = desc.missingValue;
    }

    this.setGroupRenderer('boxplot');
  }

  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.map = this.mapping.dump();
    r.filter = isSameFilter(this.currentFilter, noNumberFilter()) ? null : this.currentFilter;
    r.missingValue = this.missingValue;
    r.groupSortMethod = this.groupSortMethod;
    if (this.currentStratifyThresholds) {
      r.stratifyThreshholds = this.currentStratifyThresholds;
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (dump.map) {
      this.mapping = createMappingFunction(dump.map);
    } else if (dump.domain) {
      this.mapping = new ScaleMappingFunction(dump.domain, 'linear', dump.range || [0, 1]);
    }
    if (dump.groupSortMethod) {
      this.groupSortMethod = dump.groupSortMethod;
    }
    if (dump.filter) {
      this.currentFilter = restoreFilter(dump.filter);
    }
    if (dump.stratifyThreshholds) {
      this.currentStratifyThresholds = dump.stratifyThresholds;
    }
    if (dump.missingValue !== undefined) {
      this.missingValue = dump.missingValue;
    }
    if (dump.numberFormat) {
      this.numberFormat = format(dump.numberFormat);
    }
  }

  protected createEventList() {
    return super.createEventList().concat([NumberColumn.EVENT_MAPPING_CHANGED]);
  }

  getLabel(row: any, index: number) {
    if ((<any>this.desc).numberFormat) {
      const raw = this.getRawValue(row, index);
      //if a dedicated format and a number use the formatter in any case
      if (isNaN(raw)) {
        return 'NaN';
      }
      if (!isFinite(raw)) {
        return raw.toString();
      }
      return this.numberFormat(raw);
    }
    const v = super.getValue(row, index);
    //keep non number if it is not a number else convert using formatter
    if (typeof v === 'number') {
      return this.numberFormat(+v);
    }
    return String(v);
  }

  getRendererType(): string {
    // enforce number renderer in case of stack, min, max, ...
    if (this.parent instanceof CompositeNumberColumn) {
      return 'number';
    }
    return super.getRendererType();
  }

  getRange() {
    return this.mapping.getRange(this.numberFormat);
  }

  getRawValue(row: any, index: number, missingValue = this.missingValue) {
    const v: any = super.getValue(row, index);
    if (isMissingValue(v)) {
      return missingValue;
    }
    return +v;
  }

  isMissing(row: any, index: number) {
    return isMissingValue(super.getValue(row, index));
  }

  getValue(row: any, index: number) {
    const v = this.getRawValue(row, index);
    if (isNaN(v)) {
      return v;
    }
    return this.mapping.apply(v);
  }

  getNumber(row: any, index: number) {
    return this.getValue(row, index);
  }

  getRawNumber(row: any, index: number, missingValue = this.missingValue) {
    return this.getRawValue(row, index, missingValue);
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    return numberCompare(this.getNumber(a, aIndex), this.getNumber(b, bIndex), this.isMissing(a, aIndex), this.isMissing(b, bIndex));
  }

  groupCompare(a: IGroupData, b: IGroupData): number {
    return groupCompare(a.rows, b.rows, this, <any>this.groupSortMethod);
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
    this.currentFilter.min = isUnknown(min) ? -Infinity : min;
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getFilter());
  }

  set filterMax(max: number) {
    const bak = this.getFilter();
    this.currentFilter.max = isUnknown(max) ? Infinity : max;
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getFilter());
  }

  set filterMissing(filterMissing: boolean) {
    const bak = this.getFilter();
    this.currentFilter.filterMissing = filterMissing;
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getFilter());
  }

  setFilter(value: INumberFilter = {min: -Infinity, max: +Infinity, filterMissing: false}) {
    if (isSameFilter(value, this.currentFilter)) {
      return;
    }
    const bak = this.getFilter();
    this.currentFilter.min = isUnknown(value.min) ? -Infinity : value.min;
    this.currentFilter.max = isUnknown(value.max) ? Infinity : value.max;
    this.currentFilter.filterMissing = value.filterMissing;
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getFilter());
  }

  /**
   * filter the current row if any filter is set
   * @param row
   * @param index row index
   * @returns {boolean}
   */
  filter(row: any, index: number) {
    if (!this.isFiltered()) {
      return true;
    }
    //force a known missing value
    const v: any = this.getRawNumber(row, index, NaN);
    if (isNaN(v)) {
      return !this.filterMissing;
    }
    const vn = +v;
    return !((isFinite(this.currentFilter.min) && vn < this.currentFilter.min) || (isFinite(this.currentFilter.max) && vn > this.currentFilter.max));
  }

  getStratifyThresholds() {
    return this.currentStratifyThresholds.slice();
  }

  setStratifyThresholds(value: number[]) {
    if (equalArrays(this.currentStratifyThresholds, value)) {
      return;
    }
    const bak = this.getStratifyThresholds();
    this.currentStratifyThresholds = value.slice();
    this.fire([Column.EVENT_GROUPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, value);
  }

  group(row: any, index: number) {
    if (this.currentStratifyThresholds.length === 0) {
      return super.group(row, index);
    }
    if (this.isMissing(row, index)) {
      return missingGroup;
    }
    const value = this.getRawNumber(row, index);
    const treshholdIndex = this.currentStratifyThresholds.findIndex((t) => value <= t);
    // group by thresholds / bins
    switch (treshholdIndex) {
      case -1:
        //bigger than the last threshold
        return {
          name: `${this.label} > ${this.currentStratifyThresholds[this.currentStratifyThresholds.length - 1]}`,
          color: 'gray'
        };
      case 0:
        //smallest
        return {name: `${this.label} <= ${this.currentStratifyThresholds[0]}`, color: 'gray'};
      default:
        return {
          name: `${this.currentStratifyThresholds[index - 1]} <= ${this.label} <= ${this.currentStratifyThresholds[index]}`,
          color: 'gray'
        };
    }
  }

  getSortMethod() {
    return this.groupSortMethod;
  }

  setSortMethod(sortMethod: string) {
    if (this.groupSortMethod === sortMethod) {
      return;
    }
    this.fire([Column.EVENT_SORTMETHOD_CHANGED], this.groupSortMethod, this.groupSortMethod = sortMethod);
    // sort by me if not already sorted by me
    if (!this.isGroupSortedByMe().asc) {
      this.toggleMyGroupSorting();
    }
  }
}
