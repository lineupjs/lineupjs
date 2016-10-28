/**
 * Created by Samuel Gratzl on 06.08.2015.
 */

import * as d3 from 'd3';
import {merge, AEventDispatcher} from './utils';
/**
 * converts a given id to css compatible one
 * @param id
 * @return {string|void}
 */
function fixCSS(id) {
  return id.replace(/[\s!#$%&'\(\)\*\+,\.\/:;<=>\?@\[\\\]\^`\{\|}~]/g, '_'); //replace non css stuff to _
}

/**
 * save number comparison
 * @param a
 * @param b
 * @return {number}
 */
function numberCompare(a:number, b:number) {
  if (a === b || (isNaN(a) && isNaN(b))) {
    return 0;
  }
  return a - b;
}

interface IFlatColumn {
  col: Column;
  offset: number;
  width: number;
}

export interface IColumnParent {
  remove(col:Column): boolean;
  insert(col: Column, index?:number): Column;
  insertAfter(col:Column, reference:Column): Column;
  findMyRanker() : Ranking;
  fqid: string;

  indexOf(col: Column): number;
  at(index: number): Column;
  fqpath: string;
}

export interface IColumnDesc {
  label:string;
  /**
   * the column type
   */
  type:string;

  /**
   * column description
   */
  description?: string;

  /**
   * color of this column
   */
  color?: string;
  /**
   * css class to append to elements of this column
   */
  cssClass?: string;
}

export interface IStatistics {
  min: number;
  max: number;
  mean: number;
  count: number;
  maxBin: number;
  hist: { x : number; dx : number; y : number;}[];
}

export interface ICategoricalStatistics {
  maxBin: number;
  hist: { cat: string; y : number }[];
}

export interface IColumnMetaData {
  label: string;
  description: string;
  color: string;
}

/**
 * a column in LineUp
 */
export class Column extends AEventDispatcher {
  /**
   * default color that should be used
   * @type {string}
   */
  static DEFAULT_COLOR = '#C1C1C1';
  /**
   * magic variable for showing all columns
   * @type {number}
   */
  static FLAT_ALL_COLUMNS = -1;
  /**
   * width of a compressed column
   * @type {number}
   */
  static COMPRESSED_WIDTH = 16;

  id:string;

  /**
   * width of the column
   * @type {number}
   * @private
   */
  private width:number = 100;

  parent:IColumnParent = null;

  label:string;
  description: string;
  color:string;
  /**
   * alternative to specifying a color is defining a css class that should be used
   */
  cssClass:string;

  /**
   * whether this column is compressed i.e. just shown in a minimal version
   * @type {boolean}
   * @private
   */
  private compressed = false;

  constructor(id:string, public desc:IColumnDesc) {
    super();
    this.id = fixCSS(id);
    this.label = this.desc.label || this.id;
    this.description = this.desc.description || '';
    this.cssClass = (<any>this.desc).cssClass || '';
    this.color = (<any>this.desc).color || (this.cssClass !== '' ? null : Column.DEFAULT_COLOR);
  }

  get headerCssClass() {
    return this.desc.type;
  }

  assignNewId(idGenerator:() => string) {
    this.id = fixCSS(idGenerator());
  }

  init(callback:(desc:IColumnDesc) => Promise<IStatistics>):Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * returns the fully qualified id i.e. path the parent
   * @returns {string}
   */
  get fqid() {
    return this.parent ? this.parent.fqid + '_' + this.id : this.id;
  }

  get fqpath() {
    return this.parent ? this.parent.fqpath + '@' + this.parent.indexOf(this) : '';
  }

  /**
   * fires:
   *  * widthChanged
   *  * filterChanged
   *  * labelChanged
   *  * metaDataChanged
   *  * compressChanged
   *  * addColumn, removeColumn ... for composite pattern
   *  * dirty, dirtyHeader, dirtyValues
   * @returns {string[]}
   */
  createEventList() {
    return super.createEventList().concat(['widthChanged', 'filterChanged', 'labelChanged', 'metaDataChanged', 'compressChanged', 'addColumn', 'removeColumn', 'dirty', 'dirtyHeader', 'dirtyValues']);
  }

  getWidth() {
    return this.width;
  }

  isHidden() {
    return this.width <= 0;
  }

  setCompressed(value:boolean) {
    if (this.compressed === value) {
      return;
    }
    this.fire(['compressChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this.compressed, this.compressed = value);
  }

  getCompressed() {
    return this.compressed;
  }

  /**
   * visitor pattern for flattening the columns
   * @param r the result array
   * @param offset left offeset
   * @param levelsToGo how many levels down
   * @param padding padding between columns
   * @returns {number} the used width by this column
   */
  flatten(r:IFlatColumn[], offset:number, levelsToGo = 0, padding = 0):number {
    const w = this.compressed ? Column.COMPRESSED_WIDTH : this.getWidth();
    r.push({col: this, offset: offset, width: w});
    return w;
  }

  setWidth(value:number) {
    if (this.width === value) {
      return;
    }
    this.fire(['widthChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this.width, this.width = value);
  }

  setWidthImpl(value:number) {
    this.width = value;
  }

  setMetaData(value: IColumnMetaData) {
    if (value.label === this.label && this.color === value.color && this.description === value.description) {
      return;
    }
    var events = this.color === value.color ? ['labelChanged', 'metaDataChanged','dirtyHeader', 'dirty'] : ['labelChanged', 'metaDataChanged','dirtyHeader', 'dirtyValues', 'dirty'];
    this.fire(events, this.getMetaData(), {
      label: this.label = value.label,
      color: this.color = value.color,
      description: this.description = value.description
    });
  }

  getMetaData() : IColumnMetaData {
    return {
      label: this.label,
      color: this.color,
      description: this.description
    };
  }

  /**
   * triggers that the ranking is sorted by this column
   * @param ascending
   * @returns {any}
   */
  sortByMe(ascending = false) {
    var r = this.findMyRanker();
    if (r) {
      return r.sortBy(this, ascending);
    }
    return false;
  }

  /**
   * toggles the sorting order of this column in the ranking
   * @returns {any}
   */
  toggleMySorting() {
    var r = this.findMyRanker();
    if (r) {
      return r.toggleSorting(this);
    }
    return false;
  }

  /**
   * removes the column from the ranking
   * @returns {boolean}
   */
  removeMe() {
    if (this.parent) {
      return this.parent.remove(this);
    }
    return false;
  }

  /**
   * inserts the given column after itself
   * @param col
   * @returns {boolean}
   */
  insertAfterMe(col:Column) {
    if (this.parent) {
      return this.parent.insertAfter(col, this) != null;
    }
    return false;
  }

  /**
   * finds the underlying ranking column
   * @returns {Ranking}
   */
  findMyRanker():Ranking {
    if (this.parent) {
      return this.parent.findMyRanker();
    }
    return null;
  }

  /**
   * dumps this column to JSON compatible format
   * @param toDescRef
   * @returns {any}
   */
  dump(toDescRef:(desc:any) => any):any {
    var r:any = {
      id: this.id,
      desc: toDescRef(this.desc),
      width: this.width,
      compressed: this.compressed
    };
    if (this.label !== (this.desc.label || this.id)) {
      r.label = this.label;
    }
    if (this.color !== ((<any>this.desc).color || Column.DEFAULT_COLOR) && this.color) {
      r.color = this.color;
    }
    return r;
  }

  /**
   * restore the column content from a dump
   * @param dump
   * @param factory
   */
  restore(dump:any, factory:(dump:any) => Column) {
    this.width = dump.width || this.width;
    this.label = dump.label || this.label;
    this.color = dump.color || this.color;
    this.compressed = dump.compressed === true;
  }

  /**
   * return the label of a given row for the current column
   * @param row
   * @return {string}
   */
  getLabel(row:any):string {
    return '' + this.getValue(row);
  }

  /**
   * return the value of a given row for the current column
   * @param row
   * @return
   */
  getValue(row:any):any {
    return ''; //no value
  }

  /**
   * compare function used to determine the order according to the values of the current column
   * @param a
   * @param b
   * @return {number}
   */
  compare(a:any, b:any) {
    return 0; //can't compare
  }

  /**
   * flag whether any filter is applied
   * @return {boolean}
   */
  isFiltered() {
    return false;
  }

  /**
   * predicate whether the current row should be included
   * @param row
   * @return {boolean}
   */
  filter(row:any) {
    return row !== null;
  }
}
/**
 * a column having an accessor to get the cell value
 */
export class ValueColumn<T> extends Column {
  protected accessor:(row:any, id:string, desc:any, ranking: Ranking) => T;

  constructor(id:string, desc:any) {
    super(id, desc);
    //find accessor
    this.accessor = desc.accessor || (() => null);
  }

  getLabel(row:any) {
    return '' + this.getValue(row);
  }

  getValue(row:any) {
    return this.accessor(row, this.id, this.desc, this.findMyRanker());
  }

  compare(a:any, b:any) {
    return 0; //can't compare
  }
}

/**
 * a default column with no values
 */
export class DummyColumn extends Column {

  constructor(id:string, desc:any) {
    super(id, desc);
  }

  getLabel(row:any) {
    return '';
  }

  getValue(row:any) {
    return '';
  }

  compare(a:any, b:any) {
    return 0; //can't compare
  }
}

export interface INumberColumn {
  getNumber(row:any): number;
}

export interface ICategoricalColumn {
  categories: string[];
  categoryLabels: string[];

  getCategories(row: any): string[];
}

/**
 * checks whether the given column or description is a number column, i.e. the value is a number
 * @param col
 * @returns {boolean}
 */
export function isNumberColumn(col:Column|IColumnDesc) {
  return (col instanceof Column && typeof (<any>col).getNumber === 'function' || (!(col instanceof Column) && (<IColumnDesc>col).type.match(/(number|stack|ordinal)/) != null));
}

/**
 * checks whether the given column or description is a categorical column, i.e. the value is a list of categories
 * @param col
 * @returns {boolean}
 */
export function isCategoricalColumn(col:Column|IColumnDesc) {
  return (col instanceof Column && typeof (<any>col).getCategories === 'function' || (!(col instanceof Column) && (<IColumnDesc>col).type.match(/(categorical|ordinal)/) != null));
}

/**
 * interface of a d3 scale
 */
export interface IScale {
  (v:number): number;

  domain():number[];
  domain(domain:number[]);

  range():number[];
  range(range:number[]);
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
}

function toScale(type = 'linear'):IScale {
  switch (type) {
    case 'log':
      return d3.scale.log().clamp(true);
    case 'sqrt':
      return d3.scale.sqrt().clamp(true);
    case 'pow1.1':
      return d3.scale.pow().exponent(1.1).clamp(true);
    case 'pow2':
      return d3.scale.pow().exponent(2).clamp(true);
    case 'pow3':
      return d3.scale.pow().exponent(3).clamp(true);
    default:
      return d3.scale.linear().clamp(true);
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
  private s:IScale;

  constructor(domain:number[] = [0,1], private type = 'linear', range : number[] = [0,1]) {
    this.s = toScale(type).domain(fixDomain(domain,this.type)).range(range);
  }

  get domain() {
    return this.s.domain();
  }

  set domain(domain: number[]) {
    this.s.domain(fixDomain(domain,this.type));
  }

  get range() {
    return this.s.range();
  }

  set range(range: number[]) {
    this.s.range(range);
  }

  apply(v:number):number {
    return this.s(v);
  }

  get scaleType() {
    return this.type;
  }

  dump():any {
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

  restore(dump:any) {
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
  private f:Function;

  constructor(private domain_:number[] = [0,1], private code_:string = 'return this.linear(value,this.value_min,this.value_max);') {
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

  apply(v:number):number {
    const min = this.domain_[0],
      max = this.domain_[this.domain_.length-1];
    const r = this.f.call({
      value_min: min,
      value_max: max,
      value_range: max - min,
      value_domain: this.domain_.slice(),
      linear : (v, mi, ma) => (v-mi)/(ma-mi)
    }, v);

    if (typeof r === 'number') {
      return Math.max(Math.min(r, 1), 0);
    }
    return NaN;
  }

  dump():any {
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

  restore(dump:any) {
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
export class NumberColumn extends ValueColumn<number> implements INumberColumn {
  missingValue = 0;

  private mapping : IMappingFunction;

  private original : IMappingFunction;

  /**
   * currently active filter
   * @type {{min: number, max: number}}
   * @private
   */
  private currentFilter : INumberFilter = {min: -Infinity, max: Infinity};

  private numberFormat : (n: number) => string = d3.format('.3n');

  constructor(id:string, desc:any) {
    super(id, desc);

    if (desc.map) {
      this.mapping = createMappingFunction(desc.map);
    } else if (desc.domain) {
      this.mapping = new ScaleMappingFunction(desc.domain, 'linear', desc.range || [0,1]);
    }
    this.original = this.mapping.clone();

    if (desc.numberFormat) {
      this.numberFormat = d3.format(desc.numberFormat);
    }
  }

  init(callback:(desc:IColumnDesc) => Promise<IStatistics>):Promise<boolean> {

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

  dump(toDescRef:(desc:any) => any) {
    var r = super.dump(toDescRef);
    r.map = this.mapping.dump();
    r.filter = this.currentFilter;
    r.missingValue = this.missingValue;
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    super.restore(dump, factory);
    if (dump.map) {
      this.mapping = createMappingFunction(dump.map);
    } else if (dump.domain) {
      this.mapping = new ScaleMappingFunction(dump.domain, 'linear', dump.range || [0,1]);
    }
    if (dump.currentFilter) {
      this.currentFilter = dump.currentFilter;
    }
    if (dump.missingValue) {
      this.missingValue = dump.missingValue;
    }
    if (dump.numberFormat) {
      this.numberFormat = d3.format(dump.numberFormat);
    }
  }

  createEventList() {
    return super.createEventList().concat(['mappingChanged']);
  }

  getLabel(row:any) {
    //if a dedicated format and a number use the formatter in any case
    if ((<any>this.desc).numberFormat) {
      return this.numberFormat(this.getRawValue(row));
    }
    const v = super.getValue(row);
    //keep non number if it is not a number else convert using formatter
    return '' + (typeof v === 'number' ? this.numberFormat(+v) : v);
  }

  getRawValue(row:any) {
    var v:any = super.getValue(row);
    if (typeof(v) === 'undefined' || v == null || isNaN(v) || v === '' || v === 'NA' || (typeof(v) === 'string' && (v.toLowerCase() === 'na'))) {
      return this.missingValue;
    }
    return +v;
  }

  getValue(row:any) {
    var v = this.getRawValue(row);
    if (isNaN(v)) {
      return v;
    }
    return this.mapping.apply(v);
  }

  getNumber(row:any) {
    return this.getValue(row);
  }

  compare(a:any, b:any) {
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
    this.fire(['mappingChanged', 'dirtyValues', 'dirty'], this.mapping.clone(), this.mapping = mapping);
  }

  isFiltered() {
    return isFinite(this.currentFilter.min) || isFinite(this.currentFilter.max);
  }

  get filterMin() {
    return this.currentFilter.min;
  }

  get filterMax() {
    return this.currentFilter.max;
  }

  getFilter(): INumberFilter {
    return {
      min: this.currentFilter.min,
      max: this.currentFilter.max
    };
  }

  set filterMin(min:number) {
    var bak = {min: this.currentFilter.min, max: this.currentFilter.max};
    this.currentFilter.min = isNaN(min) ? -Infinity : min;
    this.fire(['filterChanged', 'dirtyValues', 'dirty'], bak, this.currentFilter);
  }

  set filterMax(max:number) {
    var bak = {min: this.currentFilter.min, max: this.currentFilter.max};
    this.currentFilter.max = isNaN(max) ? Infinity : max;
    this.fire(['filterChanged', 'dirtyValues', 'dirty'], bak, this.currentFilter);
  }

  setFilter(value: INumberFilter = {min: -Infinity, max: +Infinity}) {
    if (this.currentFilter.min === value.min && this.currentFilter.max === value.max) {
      return;
    }
    const bak = this.getFilter();
    this.currentFilter.min = isNaN(value.min) ? -Infinity :value. min;
    this.currentFilter.max = isNaN(value.max) ? Infinity : value.max;
    this.fire(['filterChanged', 'dirtyValues', 'dirty'], bak, this.currentFilter);
  }

  /**
   * filter the current row if any filter is set
   * @param row
   * @returns {boolean}
   */
  filter(row:any) {
    if (!this.isFiltered()) {
      return true;
    }
    var v = this.getRawValue(row);
    if (isNaN(v)) {
      return true;
    }
    return !((isFinite(this.currentFilter.min) && v < this.currentFilter.min) || (isFinite(this.currentFilter.max) && v > this.currentFilter.max));
  }
}

/**
 * a string column with optional alignment
 */
export class StringColumn extends ValueColumn<string> {
  //magic key for filtering missing ones
  static FILTER_MISSING = '__FILTER_MISSING';
  private currentFilter:string|RegExp = null;

  private _alignment:string = 'left';

  constructor(id:string, desc:any) {
    super(id, desc);
    this.setWidthImpl(200); //by default 200
    this._alignment = desc.alignment || 'left';
  }

  //readonly
  get alignment() {
    return this._alignment;
  }

  getValue(row:any) {
    var v:any = super.getValue(row);
    if (typeof(v) === 'undefined' || v == null) {
      return '';
    }
    return String(v);
  }

  dump(toDescRef:(desc:any) => any):any {
    var r = super.dump(toDescRef);
    if (this.currentFilter instanceof RegExp) {
      r.filter = 'REGEX:' + (<RegExp>this.currentFilter).source;
    } else {
      r.filter = this.currentFilter;
    }
    r.alignment = this.alignment;
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    super.restore(dump, factory);
    if (dump.filter && dump.filter.slice(0, 6) === 'REGEX:') {
      this.currentFilter = new RegExp(dump.filter.slice(6));
    } else {
      this.currentFilter = dump.filter || null;
    }
    this._alignment = dump.alignment || this._alignment;
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row:any) {
    if (!this.isFiltered()) {
      return true;
    }
    var r = this.getLabel(row),
      filter = this.currentFilter;

    if (filter === StringColumn.FILTER_MISSING) { //filter empty
      return r != null && r.trim() !== '';
    }
    if (typeof filter === 'string' && filter.length > 0) {
      return r && r.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
    }
    if (filter instanceof RegExp) {
      return r && filter.test(r);
    }
    return true;
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter:string|RegExp) {
    if (filter === '') {
      filter = null;
    }
    if (this.currentFilter === filter) {
      return;
    }
    this.fire(['filterChanged', 'dirtyValues', 'dirty'], this.currentFilter, this.currentFilter = filter);
  }

  compare(a:any, b:any) {
    var a_val: string, b_val: string;
    if((a_val = this.getValue(a)) === '') {
      return this.getValue(b) === '' ? 0 : +1; //same = 0
    } else if((b_val = this.getValue(b)) === '') {
      return -1;
    }
    return a_val.localeCompare(b_val);
  }
}

/**
 * a string column in which the label is a text but the value a link
 */
export class LinkColumn extends StringColumn {
  /**
   * a pattern used for generating the link, $1 is replaced with the actual value
   * @type {null}
   */
  private link = null;

  constructor(id:string, desc:any) {
    super(id, desc);
    this.link = desc.link;
  }

  get headerCssClass() {
    return this.link == null ? 'link' : 'link link_pattern';
  }

  createEventList() {
    return super.createEventList().concat(['linkChanged']);
  }

  setLink(link: string) {
    /* tslint:disable */
    if (link == this.link) { /*== on purpose*/
      return;
    }
    /* tslint:enable */
    this.fire(['linkChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this.link, this.link = link);
  }

  getLink() {
    return this.link || '';
  }

  dump(toDescRef:(desc:any) => any):any {
    var r = super.dump(toDescRef);
    /* tslint:disable */
    if (this.link != (<any>this.desc).link) {
      r.link = this.link;
    }
    /* tslint:enable */
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    super.restore(dump, factory);
    if (dump.link) {
      this.link = dump.link;
    }
  }

  getLabel(row:any) {
    var v:any = super.getValue(row);
    if (v.alt) {
      return v.alt;
    }
    return '' + v;
  }

  isLink(row: any) {
    if (this.link) {
      return true;
    }
    //get original value
    var v:any = super.getValue(row);
    //convert to link
    return v.href != null;
  }

  getValue(row:any) {
    //get original value
    var v:any = super.getValue(row);
    //convert to link
    if (v.href) {
      return v.href;
    } else if (this.link) {
      return this.link.replace(/\$1/g, v);
    }
    return v;
  }
}

/**
 * a string column in which the values can be edited locally
 */
export class AnnotateColumn extends StringColumn {
  private annotations = d3.map<string>();

  constructor(id:string, desc:any) {
    super(id, desc);
  }

  createEventList() {
    return super.createEventList().concat(['valueChanged']);
  }

  getValue(row:any) {
    var index = String(row._index);
    if (this.annotations.has(index)) {
      return this.annotations.get(index);
    }
    return super.getValue(row);
  }

  dump(toDescRef:(desc:any) => any):any {
    var r = super.dump(toDescRef);
    r.annotations = {};
    this.annotations.forEach((k, v) => {
      r.annotations[k] = v;
    });
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    super.restore(dump, factory);
    if (dump.annotations) {
      Object.keys(dump.annotations).forEach((k) => {
        this.annotations.set(k, dump.annotations[k]);
      });
    }
  }

  setValue(row:any, value:string) {
    var old = this.getValue(row);
    if (old === value) {
      return true;
    }
    if (value === '' || value == null) {
      this.annotations.remove(String(row._index));
    } else {
      this.annotations.set(String(row._index), value);
    }
    this.fire(['valueChanged', 'dirtyValues', 'dirty'], row._index, old, value);
    return true;
  }
}

function arrayEquals<T>(a: T[], b: T[]) {
  const al = a != null ? a.length : 0;
  const bl = b != null ? b.length : 0;
  if (al !== bl) {
    return false;
  }
  if (al === 0) {
    return true;
  }
  return a.every((ai,i) => ai === b[i]);
}

/**
 * a checkbox column for selections
 */
export class SelectionColumn extends ValueColumn<boolean> {
  /**
   * factory for creating a description creating a rank column
   * @param label
   * @returns {{type: string, label: string}}
   */
  static desc(label:string = 'S') {
    return {type: 'selection', label: label};
  }


  constructor(id:string, desc:any) {
    super(id, desc);
    this.setCompressed(true);
  }

  createEventList() {
    return super.createEventList().concat(['select']);
  }

  setValue(row:any, value:boolean) {
    const old = this.getValue(row);
    if (old === value) {
      return true;
    }
    return this.setImpl(row, value);
  }

  private setImpl(row: any, value: boolean) {
    if ((<any>this.desc).setter) {
      (<any>this.desc).setter(row, value);
    }
    this.fire('select', row, value);
    return true;
  }

  toggleValue(row:any) {
    const old = this.getValue(row);
    this.setImpl(row, !old);
    return !old;
  }

  compare(a:any, b:any) {
    return d3.ascending(this.getValue(a), this.getValue(b));
  }
}


/**
 * a string column with optional alignment
 */
export class BooleanColumn extends ValueColumn<boolean> {
  private currentFilter:boolean = null;
  private trueMarker = 'X';
  private falseMarker = '';

  constructor(id:string, desc:any) {
    super(id, desc);
    this.setWidthImpl(30);
    this.trueMarker = desc.trueMarker || this.trueMarker;
    this.falseMarker = desc.falseMarker || this.falseMarker;
  }

  getValue(row:any) {
    var v:any = super.getValue(row);
    if (typeof(v) === 'undefined' || v == null) {
      return false;
    }
    return v === true || v === 'true' || v === 'yes' || v === 'x';
  }

  getLabel(row: any) {
    const v = this.getValue(row);
    return v ? this.trueMarker : this.falseMarker;
  }

  dump(toDescRef:(desc:any) => any):any {
    var r = super.dump(toDescRef);
    if (this.currentFilter !== null) {
      r.filter = this.currentFilter;
    }
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    super.restore(dump, factory);
    if (typeof dump.filter !== 'undefined') {
      this.currentFilter = dump.filter;
    }
  }

  isFiltered() {
    return this.currentFilter !== null;
  }

  filter(row:any) {
    if (!this.isFiltered()) {
      return true;
    }
    var r = this.getValue(row);
    return r === this.currentFilter;
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter:boolean) {
    if (this.currentFilter === filter) {
      return;
    }
    this.fire(['filterChanged', 'dirtyValues', 'dirty'], this.currentFilter, this.currentFilter = filter);
  }

  compare(a:any[], b:any[]) {
    return d3.ascending(this.getValue(a), this.getValue(b));
  }
}

/**
 * column for categorical values
 */
export class CategoricalColumn extends ValueColumn<string> implements ICategoricalColumn {
  /**
   * colors for each category
   * @type {Ordinal<string, string>}
   */
  private colors = d3.scale.category10();

  /**
   * category labels by default the category name itself
   * @type {Array}
   */
  private catLabels = d3.map<string>();

  /**
   * set of categories to show
   * @type {null}
   * @private
   */
  private currentFilter:string[] = null;

  /**
   * split multiple categories
   * @type {string}
   */
  private separator = ';';

  constructor(id:string, desc:any) {
    super(id, desc);
    this.separator = desc.separator || this.separator;
    this.initCategories(desc);
    //TODO infer categories from data
  }

  initCategories(desc:any) {
    if (desc.categories) {
      var cats = [],
        cols = this.colors.range(),
        labels = d3.map<string>();
      desc.categories.forEach((cat, i) => {
        if (typeof cat === 'string') {
          //just the category value
          cats.push(cat);
        } else {
          //the name or value of the category
          cats.push(cat.name || cat.value);
          //optional label mapping
          if (cat.label) {
            labels.set(cat.name, cat.label);
          }
          //optional color
          if (cat.color) {
            cols[i] = cat.color;
          }
        }
      });
      this.catLabels = labels;
      this.colors.domain(cats).range(cols);
    }
  }

  get categories() {
    return this.colors.domain();
  }

  get categoryColors() {
    return this.colors.range();
  }

  get categoryLabels() {
    //no mapping
    if (this.catLabels === null || this.catLabels.empty()) {
      return this.categories;
    }
    //label or identity mapping
    return this.categories.map((c) => this.catLabels.has(c) ? this.catLabels.get(c) : c);
  }

  colorOf(cat: string) {
    return this.colors(cat);
  }

  getLabel(row:any) {
    //no mapping
    if (this.catLabels === null || this.catLabels.empty()) {
      return '' + StringColumn.prototype.getValue.call(this, row);
    }
    return this.getLabels(row).join(this.separator);
  }

  getFirstLabel(row:any) {
    const l = this.getLabels(row);
    return l.length > 0 ? l[0] : null;
  }


  getLabels(row:any) {
    var v = StringColumn.prototype.getValue.call(this, row);
    const r = v ? v.split(this.separator): [];

    const mapToLabel = (values: string[]) => {
      if (this.catLabels === null || this.catLabels.empty()) {
        return values;
      }
      return values.map((v) => this.catLabels.has(v) ? this.catLabels.get(v) : v);
    };
    return mapToLabel(r);
  }

  getValue(row:any) {
    const r = this.getValues(row);
    return r.length > 0 ? r[0] : null;
  }

  getValues(row:any) {
    var v = StringColumn.prototype.getValue.call(this, row);
    const r = v ? v.split(this.separator): [];
    return r;
  }

  getCategories(row: any) {
    return this.getValues(row);
  }

  getColor(row:any) {
    var cat = this.getValue(row);
    if (cat === null || cat === '') {
      return null;
    }
    return this.colors(cat);
  }

  getColors(row:any) {
    return this.getCategories(row).map(this.colors);
  }

  dump(toDescRef:(desc:any) => any):any {
    var r = super.dump(toDescRef);
    r.filter = this.currentFilter;
    r.colors = {
      domain: this.colors.domain(),
      range: this.colors.range(),
      separator: this.separator
    };
    if (this.catLabels !== null && !this.catLabels.empty()) {
      r.labels = this.catLabels.entries();
    }
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    super.restore(dump, factory);
    this.currentFilter = dump.filter || null;
    if (dump.colors) {
      this.colors.domain(dump.colors.domain).range(dump.colors.range);
    }
    if (dump.labels) {
      this.catLabels = d3.map<string>();
      dump.labels.forEach((e) => this.catLabels.set(e.key, e.value));
    }
    this.separator = dump.separator || this.separator;
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row:any):boolean {
    if (!this.isFiltered()) {
      return true;
    }
    var vs = this.getCategories(row),
      filter:any = this.currentFilter;
    return vs.every((v) => {
      if (Array.isArray(filter) && filter.length > 0) { //array mode
        return filter.indexOf(v) >= 0;
      } else if (typeof filter === 'string' && filter.length > 0) { //search mode
        return v && v.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
      } else if (filter instanceof RegExp) { //regex match mode
        return v != null && v.match(filter).length > 0;
      }
      return true;
    });
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter:string[]) {
    if (arrayEquals(this.currentFilter,filter)) {
      return;
    }
    this.fire(['filterChanged', 'dirtyValues', 'dirty'], this.currentFilter, this.currentFilter = filter);
  }

  compare(a:any, b:any) {
    const va = this.getValues(a);
    const vb = this.getValues(b);
    //check all categories
    for (let i = 0; i < Math.min(va.length, vb.length); ++i) {
      let ci = d3.ascending(va[i], vb[i]);
      if (ci !== 0) {
        return ci;
      }
    }
    //smaller length wins
    return va.length - vb.length;
  }
}

/**
 * similar to a categorical column but the categories are mapped to numbers
 */
export class CategoricalNumberColumn extends ValueColumn<number> implements INumberColumn, ICategoricalColumn {
  private colors = d3.scale.category10();

  /**
   * category labels by default the category name itself
   * @type {Array}
   */
  private catLabels = d3.map<string>();

  private scale = d3.scale.ordinal().rangeRoundPoints([0, 1]);

  private currentFilter:string[] = null;
  /**
   * separator for multi handling
   * @type {string}
   */
  private separator = ';';
  private combiner = d3.max;

  constructor(id:string, desc:any) {
    super(id, desc);
    this.separator = desc.separator || this.separator;
    CategoricalColumn.prototype.initCategories.call(this, desc);

    this.scale.domain(this.colors.domain());
    if (desc.categories) {
      //lookup value or 0.5 by default
      let values = desc.categories.map((d) => ((typeof d !== 'string' && typeof (d.value) === 'number')) ? d.value : 0.5);
      this.scale.range(values);
    }
  }

  createEventList() {
    return super.createEventList().concat(['mappingChanged']);
  }

  get categories() {
    return this.colors.domain().slice();
  }

  get categoryColors() {
    return this.colors.range().slice();
  }

  get categoryLabels() {
    //no mapping
    if (this.catLabels === null || this.catLabels.empty()) {
      return this.categories;
    }
    //label or identity mapping
    return this.categories.map((c) => this.catLabels.has(c) ? this.catLabels.get(c) : c);
  }

  colorOf(cat: string) {
    return this.colors(cat);
  }

  getLabel(row:any) {
    return CategoricalColumn.prototype.getLabel.call(this, row);
  }

  getFirstLabel(row:any) {
    return CategoricalColumn.prototype.getFirstLabel.call(this, row);
  }

  getLabels(row:any) {
    return CategoricalColumn.prototype.getLabels.call(this, row);
  }

  getValue(row:any) {
    const r = this.getValues(row);
    return r.length > 0 ? this.combiner(r) : 0;
  }

  getValues(row:any) {
    const r = CategoricalColumn.prototype.getValues.call(this, row);
    return r.map(this.scale);
  }

  getCategories(row: any) {
    return CategoricalColumn.prototype.getValues.call(this, row);
  }

  getNumber(row:any) {
    return this.getValue(row);
  }

  getColor(row:any) {
    const vs = this.getValues(row);
    const cs = this.getColors(row);
    if (this.combiner === d3.max) {
      //use the max color
      return cs.slice(1).reduce((prev, act, i) => vs[i + 1] > prev.v ? {c: act, v: vs[i + 1]} : prev, {
        c: cs[0],
        v: vs[0]
      }).c;
    } else if (this.combiner === d3.min) {
      //use the max color
      return cs.slice(1).reduce((prev, act, i) => vs[i + 1] < prev.v ? {c: act, v: vs[i + 1]} : prev, {
        c: cs[0],
        v: vs[0]
      }).c;
    } else {
      //use the first
      return cs[0] || null;
    }
  }

  getColors(row) {
    return CategoricalColumn.prototype.getColors.call(this, row);
  }

  dump(toDescRef:(desc:any) => any):any {
    var r = CategoricalColumn.prototype.dump.call(this, toDescRef);
    r.scale = {
      domain: this.scale.domain(),
      range: this.scale.range(),
      separator: this.separator
    };
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    CategoricalColumn.prototype.restore.call(this, dump, factory);
    if (dump.scale) {
      this.scale.domain(dump.scale.domain).range(dump.scale.range);
    }
    this.separator = dump.separator || this.separator;
  }

  getScale() {
    return {
      domain: this.scale.domain(),
      range: this.scale.range()
    };
  }

  getMapping() {
    return this.scale.range().slice();
  }

  setMapping(range:number[]) {
    var bak = this.getScale();
    this.scale.range(range);
    this.fire(['mappingChanged', 'dirtyValues', 'dirty'], bak, this.getScale());
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row:any):boolean {
    return CategoricalColumn.prototype.filter.call(this, row);
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter:string[]) {
    if (this.currentFilter === filter) {
      return;
    }
    this.fire(['filterChanged', 'dirtyValues', 'dirty'], this.currentFilter, this.currentFilter = filter);
  }

  compare(a:any, b:any) {
    return NumberColumn.prototype.compare.call(this, a, b);
  }
}


/**
 * implementation of a combine column, standard operations how to select
 */
export class CompositeColumn extends Column implements IColumnParent {
  protected _children:Column[] = [];

  constructor(id:string, desc:any) {
    super(id, desc);
  }

  assignNewId(idGenerator:() => string) {
    super.assignNewId(idGenerator);
    this._children.forEach((c) => c.assignNewId(idGenerator));
  }

  get children() {
    return this._children.slice();
  }

  get length() {
    return this._children.length;
  }

  flatten(r:IFlatColumn[], offset:number, levelsToGo = 0, padding = 0) {
    var self = null;
    //no more levels or just this one
    if (levelsToGo === 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      var w = this.getCompressed() ? Column.COMPRESSED_WIDTH : this.getWidth();
      r.push(self = {col: this, offset: offset, width: w});
      if (levelsToGo === 0) {
        return w;
      }
    }
    //push children
    this._children.forEach((c) => {
      if (!c.isHidden() || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
        c.flatten(r, offset, levelsToGo - 1, padding);
      }
    });
    return w;
  }

  dump(toDescRef:(desc:any) => any) {
    var r = super.dump(toDescRef);
    r.children = this._children.map((d) => d.dump(toDescRef));
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    dump.children.map((child) => {
      var c = factory(child);
      if (c) {
        this.push(c);
      }
    });
    super.restore(dump, factory);
  }

  /**
   * inserts a column at a the given position
   * @param col
   * @param index
   * @param weight
   * @returns {any}
   */
  insert(col:Column, index:number) {
    this._children.splice(index, 0, col);
    //listen and propagate events
    return this.insertImpl(col, index);
  }

  protected insertImpl(col: Column, index: number) {
    col.parent = this;
    this.forward(col, 'dirtyHeader.combine', 'dirtyValues.combine', 'dirty.combine', 'filterChanged.combine');
    this.fire(['addColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], col, index);
    return col;
  }

  push(col:Column) {
    return this.insert(col, this._children.length);
  }

  at(index: number) {
    return this._children[index];
  }

  indexOf(col:Column) {
    return this._children.indexOf(col);
  }

  insertAfter(col:Column, ref:Column) {
    var i = this.indexOf(ref);
    if (i < 0) {
      return null;
    }
    return this.insert(col, i + 1);
  }
  remove(child:Column) {
    var i = this._children.indexOf(child);
    if (i < 0) {
      return false;
    }
    this._children.splice(i, 1); //remove and deregister listeners
    return this.removeImpl(child);
  }

  protected removeImpl(child: Column) {
    child.parent = null;
    this.unforward(child, 'dirtyHeader.combine', 'dirtyValues.combine', 'dirty.combine', 'filterChanged.combine');
    this.fire(['removeColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], child);
    return true;
  }

  getColor(row: any) {
    return this.color;
  }

  isFiltered() {
    return this._children.some((d) => d.isFiltered());
  }

  filter(row:any) {
    return this._children.every((d) => d.filter(row));
  }
}

/**
 * implementation of a combine column, standard operations how to select
 */
export class CompositeNumberColumn extends CompositeColumn implements INumberColumn {
  public missingValue = 0;

  private numberFormat : (n: number) => string = d3.format('.3n');

  constructor(id:string, desc:any) {
    super(id, desc);

    if (desc.numberFormat) {
      this.numberFormat = d3.format(desc.numberFormat);
    }
  }


  dump(toDescRef:(desc:any) => any) {
    var r = super.dump(toDescRef);
    r.missingValue = this.missingValue;
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    if (dump.missingValue) {
      this.missingValue = dump.missingValue;
    }
    if (dump.numberFormat) {
      this.numberFormat = d3.format(dump.numberFormat);
    }
    super.restore(dump, factory);
  }

  /**
   * inserts a column at a the given position
   * @param col
   * @param index
   * @param weight
   * @returns {any}
   */
  insert(col:Column, index:number) {
    if (!isNumberColumn(col)) { //indicator it is a number type
      return null;
    }
    return super.insert(col, index);
  }

  getLabel(row: any) {
    const v = this.getValue(row);
    //keep non number if it is not a number else convert using formatter
    return '' + (typeof v === 'number' ? this.numberFormat(v) : v);
  }

  getValue(row:any) {
    //weighted sum
    const v = this.compute(row);
    if (typeof(v) === 'undefined' || v == null || isNaN(v)) {
      return this.missingValue;
    }
    return v;
  }

  protected compute(row: any) {
    return NaN;
  }

  getNumber(row:any) {
    return this.getValue(row);
  }

  compare(a:any, b:any) {
    return numberCompare(this.getValue(a), this.getValue(b));
  }
}

export interface IMultiLevelColumn extends CompositeColumn {
  getCollapsed(): boolean;
  setCollapsed(value: boolean);
}

export function isMultiLevelColumn(col: Column) {
  return typeof ((<any>col).getCollapsed) === 'function';
}

/**
 * implementation of the stacked column
 */
export class StackColumn extends CompositeNumberColumn implements IMultiLevelColumn {
  /**
   * factory for creating a description creating a stacked column
   * @param label
   * @returns {{type: string, label: string}}
   */
  static desc(label:string = 'Combined') {
    return {type: 'stack', label: label};
  }

  private adaptChange;

  /**
   * whether this stack column is collapsed i.e. just looks like an ordinary number column
   * @type {boolean}
   * @private
   */
  private collapsed = false;

  constructor(id:string, desc:any) {
    super(id, desc);

    const that = this;
    this.adaptChange = function (old, new_) {
      that.adaptWidthChange(this.source, old, new_);
    };
  }

  createEventList() {
    return super.createEventList().concat(['collapseChanged', 'weightsChanged']);
  }

  setCollapsed(value:boolean) {
    if (this.collapsed === value) {
      return;
    }
    this.fire(['collapseChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this.collapsed, this.collapsed = value);
  }

  getCollapsed() {
    return this.collapsed;
  }

  flatten(r:IFlatColumn[], offset:number, levelsToGo = 0, padding = 0) {
    var self = null;
    const children =  levelsToGo <= Column.FLAT_ALL_COLUMNS ? this._children : this._children.filter((c) => !c.isHidden());
    //no more levels or just this one
    if (levelsToGo === 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      var w = this.getCompressed() ? Column.COMPRESSED_WIDTH : this.getWidth();
      if (!this.collapsed && !this.getCompressed()) {
        w += (children.length - 1) * padding;
      }
      r.push(self = {col: this, offset: offset, width: w});
      if (levelsToGo === 0) {
        return w;
      }
    }
    //push children
    var acc = offset;
    children.forEach((c) => {
      acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
    });
    if (self) { //nesting my even increase my width
      self.width = acc - offset - padding;
    }
    return acc - offset - padding;
  }

  dump(toDescRef:(desc:any) => any) {
    const r = super.dump(toDescRef);
    r.collapsed = this.collapsed;
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    this.collapsed = dump.collapsed === true;
    super.restore(dump, factory);
  }

  /**
   * inserts a column at a the given position
   * @param col
   * @param index
   * @param weight
   * @returns {any}
   */
  insert(col:Column, index:number, weight = NaN) {
    if (!isNaN(weight)) {
      col.setWidth((weight / (1 - weight) * this.getWidth()));
    }
    col.on('widthChanged.stack', this.adaptChange);
    //increase my width
    super.setWidth(this.length === 0 ? col.getWidth() : (this.getWidth() + col.getWidth()));

    return super.insert(col, index);
  }

  push(col:Column, weight = NaN) {
    return this.insert(col, this.length, weight);
  }

  insertAfter(col:Column, ref:Column, weight = NaN) {
    const i = this.indexOf(ref);
    if (i < 0) {
      return null;
    }
    return this.insert(col, i + 1, weight);
  }

  /**
   * adapts weights according to an own width change
   * @param col
   * @param old
   * @param new_
   */
  private adaptWidthChange(col:Column, old: number, new_: number) {
    if (old === new_) {
      return;
    }
    const bak = this.getWeights();
    const full = this.getWidth(),
      change = (new_ - old) / full;
    const oldWeight = old / full;
    const factor = (1 - oldWeight - change) / (1 - oldWeight);
    this._children.forEach((c) => {
      if (c === col) {
        //c.weight += change;
      } else {
        c.setWidthImpl(c.getWidth() * factor);
      }
    });
    this.fire(['weightsChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], bak, this.getWeights());
  }

  getWeights() {
    const w = this.getWidth();
    return this._children.map((d) => d.getWidth() / w);
  }

  setWeights(weights:number[]) {
    const bak = this.getWeights();
    var s,
      delta = weights.length - this.length;
    if (delta < 0) {
      s = d3.sum(weights);
      if (s <= 1) {
        for (var i = 0; i < -delta; ++i) {
          weights.push((1 - s) * (1 / -delta));
        }
      } else if (s <= 100) {
        for (var i = 0; i < -delta; ++i) {
          weights.push((100 - s) * (1 / -delta));
        }
      }
    }
    weights = weights.slice(0, this.length);
    s = d3.sum(weights) / this.getWidth();
    weights = weights.map(d => d / s);

    this._children.forEach((c, i) => {
      c.setWidthImpl(weights[i]);
    });
    this.fire(['weightsChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], bak, weights);

  }

  removeImpl(child:Column) {
    child.on('widthChanged.stack', null);
    super.setWidth(this.length === 1 ? 100 : this.getWidth() - child.getWidth());
    return super.removeImpl(child);
  }

  setWidth(value:number) {
    const factor = value / this.getWidth();
    this._children.forEach((child) => {
      //disable since we change it
      child.setWidthImpl(child.getWidth() * factor);
    });
    super.setWidth(value);
  }

  protected compute(row: any) {
    const w = this.getWidth();
    return this._children.reduce((acc, d) => acc + d.getValue(row) * (d.getWidth() / w), 0);
  }
}

/**
 * combines multiple columns by using the maximal value
 */
export class MaxColumn extends CompositeNumberColumn {
  /**
   * factory for creating a description creating a max column
   * @param label
   * @returns {{type: string, label: string}}
   */
  static desc(label:string = 'Max') {
    return {type: 'max', label: label};
  }

  constructor(id:string, desc:any) {
    super(id, desc);
  }

  getColor(row: any) {
    //compute the index of the maximal one
    const c = this._children;
    if (c.length === 0) {
      return this.color;
    }
    var max_i = 0, max_v = c[0].getValue(row);
    for(let i = 1; i < c.length; ++i) {
      let v = c[i].getValue(row);
      if (v > max_v) {
        max_i = i;
        max_v = v;
      }
    }
    return c[max_i].color;
  }

  protected compute(row: any) {
    return d3.max(this._children, (d) => d.getValue(row));
  }
}

export class MinColumn extends CompositeNumberColumn {
  /**
   * factory for creating a description creating a min column
   * @param label
   * @returns {{type: string, label: string}}
   */
  static desc(label:string = 'Min') {
    return {type: 'min', label: label};
  }

  constructor(id:string, desc:any) {
    super(id, desc);
  }

  getColor(row: any) {
    //compute the index of the maximal one
    const c = this._children;
    if (c.length === 0) {
      return this.color;
    }
    var min_i = 0, min_v = c[0].getValue(row);
    for(let i = 1; i < c.length; ++i) {
      let v = c[i].getValue(row);
      if (v < min_v) {
        min_i = i;
        min_v = v;
      }
    }
    return c[min_i].color;
  }

  protected compute(row: any) {
    return d3.min(this._children, (d) => d.getValue(row));
  }
}

export class MeanColumn extends CompositeNumberColumn {
  /**
   * factory for creating a description creating a mean column
   * @param label
   * @returns {{type: string, label: string}}
   */
  static desc(label:string = 'Mean') {
    return {type: 'mean', label: label};
  }

  constructor(id:string, desc:any) {
    super(id, desc);
  }

  protected compute(row: any) {
    return d3.mean(this._children, (d) => d.getValue(row));
  }
}

export class MultiLevelCompositeColumn extends CompositeColumn implements IMultiLevelColumn {
  private adaptChange;

  /**
   * whether this stack column is collapsed i.e. just looks like an ordinary number column
   * @type {boolean}
   * @private
   */
  private collapsed = false;

  constructor(id:string, desc:any) {
    super(id, desc);
    const that = this;
    this.adaptChange = function (old, new_) {
      that.adaptWidthChange(this.source, old, new_);
    };
  }

  createEventList() {
    return super.createEventList().concat(['collapseChanged']);
  }

  setCollapsed(value:boolean) {
    if (this.collapsed === value) {
      return;
    }
    this.fire(['collapseChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this.collapsed, this.collapsed = value);
  }

  getCollapsed() {
    return this.collapsed;
  }

  dump(toDescRef:(desc:any) => any) {
    const r = super.dump(toDescRef);
    r.collapsed = this.collapsed;
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    this.collapsed = dump.collapsed === true;
    super.restore(dump, factory);
  }

  flatten(r:IFlatColumn[], offset:number, levelsToGo = 0, padding = 0) {
    return StackColumn.prototype.flatten.call(this, r, offset, levelsToGo, padding);
  }

  /**
   * inserts a column at a the given position
   * @param col
   * @param index
   * @param weight
   * @returns {any}
   */
  insert(col:Column, index:number) {
    col.on('widthChanged.stack', this.adaptChange);
    //increase my width
    super.setWidth(this.length === 0 ? col.getWidth() : (this.getWidth() + col.getWidth()));

    return super.insert(col, index);
  }

  /**
   * adapts weights according to an own width change
   * @param col
   * @param old
   * @param new_
   */
  private adaptWidthChange(col:Column, old: number, new_: number) {
    if (old === new_) {
      return;
    }
    super.setWidth(this.getWidth()+(new_ - old));
  }

  removeImpl(child:Column) {
    child.on('widthChanged.stack', null);
    super.setWidth(this.length === 1 ? 100 : this.getWidth() - child.getWidth());
    return super.removeImpl(child);
  }

  setWidth(value:number) {
    const factor = this.length / this.getWidth();
    this._children.forEach((child) => {
      //disable since we change it
      child.setWidthImpl(child.getWidth() * factor);
    });
    super.setWidth(value);
  }
}
/**
 * a nested column is a composite column where the sorting order is determined by the nested ordering of the children
 * i.e., sort by the first child if equal sort by the second child,...
 */
export class NestedColumn extends MultiLevelCompositeColumn {
  /**
   * factory for creating a description creating a mean column
   * @param label
   * @returns {{type: string, label: string}}
   */
  static desc(label:string = 'Nested') {
    return {type: 'nested', label: label};
  }

  constructor(id:string, desc:any) {
    super(id, desc);
  }

  compare(a:any, b:any) {
    const c = this.children;
    for (let ci of c) {
      let ci_result = ci.compare(a, b);
      if (ci_result !== 0) {
        return ci_result;
      }
    }
    return 0;
  }

  getLabel(row: any) {
    return this.children.map((d) => d.getLabel(row)).join(';');
  }

  getValue(row:any) {
    return this.children.map((d) => d.getValue(row)).join(';');
  }
}

export class ScriptColumn extends CompositeColumn {
  /**
   * factory for creating a description creating a mean column
   * @param label
   * @returns {{type: string, label: string}}
   */
  static desc(label:string = 'script') {
    return {type: 'script', label: label, script: ScriptColumn.DEFAULT_SCRIPT};
  }

  static DEFAULT_SCRIPT = 'return d3.max(values)';

  private script = ScriptColumn.DEFAULT_SCRIPT;
  private f : Function = null;

  constructor(id:string, desc:any) {
    super(id, desc);
    this.script = desc.script || this.script;
  }

  createEventList() {
    return super.createEventList().concat(['scriptChanged']);
  }

  setScript(script: string) {
    if (this.script === script) {
      return;
    }
    this.f = null;
    this.fire(['scriptChanged', 'dirtyValues', 'dirty'], this.script, this.script = script);
  }

  getScript() {
    return this.script;
  }

  dump(toDescRef:(desc:any) => any) {
    const r = super.dump(toDescRef);
    r.script = this.script;
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    this.script = dump.script || this.script;
    super.restore(dump, factory);
  }

  protected compute(row: any) {
    if (this.f == null) {
      this.f = new Function('children','values', this.script);
    }
    return this.f.call(this, this._children, this._children.map((d) => d.getValue(row)));
  }
}

/**
 * a rank column
 */
export class RankColumn extends ValueColumn<number> {
  /**
   * factory for creating a description creating a rank column
   * @param label
   * @returns {{type: string, label: string}}
   */
  static desc(label:string = 'Rank') {
    return {type: 'rank', label: label};
  }

  constructor(id:string, desc:any) {
    super(id, desc);
    this.setWidthImpl(50);
  }
}

export interface ISortCriteria {
  col:Column;
  asc:boolean;
}

/**
 * a ranking
 */
export class Ranking extends AEventDispatcher implements IColumnParent {

  /**
   * the current sort criteria
   * @type {null}
   * @private
   */
  private sortColumn:Column = null;
  /**
   * ascending or descending order
   * @type {boolean}
   */
  private ascending = false;

  /**
   * columns of this ranking
   * @type {Array}
   * @private
   */
  private columns:Column[] = [];

  comparator = (a:any, b:any) => {
    if (this.sortColumn === null) {
      return 0;
    }
    var r = this.sortColumn.compare(a, b);
    return this.ascending ? r : -r;
  };

  dirtyOrder = () => {
    this.fire(['dirtyOrder', 'dirtyValues', 'dirty'], this.getSortCriteria());
  };

  /**
   * the current ordering as an sorted array of indices
   * @type {Array}
   */
  private order:number[] = [];

  constructor(public id : string) {
    super();
    this.id = fixCSS(id);
  }

  createEventList() {
    return super.createEventList().concat(['widthChanged', 'filterChanged', 'labelChanged', 'compressChanged', 'addColumn', 'removeColumn', 'dirty', 'dirtyHeader', 'dirtyValues', 'sortCriteriaChanged', 'dirtyOrder', 'orderChanged']);
  }

  assignNewId(idGenerator:() => string) {
    this.id = fixCSS(idGenerator());
    this.columns.forEach((c) => c.assignNewId(idGenerator));
  }

  setOrder(order:number[]) {
    this.fire(['orderChanged', 'dirtyValues', 'dirty'], this.order, this.order = order);
  }

  getOrder() {
    return this.order;
  }

  dump(toDescRef:(desc:any) => any) {
    var r : any = {};
    r.columns = this.columns.map((d) => d.dump(toDescRef));
    r.sortColumn = {
      asc: this.ascending
    };
    if (this.sortColumn) {
      r.sortColumn.sortBy = this.sortColumn.id; //store the index not the object
    }
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    this.clear();
    dump.columns.map((child) => {
      var c = factory(child);
      if (c) {
        this.push(c);
      }
    });
    if (dump.sortColumn) {
      this.ascending = dump.sortColumn.asc;
      if (dump.sortColumn.sortBy) {
        let help = this.columns.filter((d) => d.id === dump.sortColumn.sortBy);
        this.sortBy(help.length === 0 ? null : help[0], dump.sortColumn.asc);
      }
    }
  }

  flatten(r:IFlatColumn[], offset:number, levelsToGo = 0, padding = 0) {
    var acc = offset; // + this.getWidth() + padding;
    if (levelsToGo > 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      this.columns.forEach((c) => {
        if (!c.isHidden() || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
          acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
        }
      });
    }
    return acc - offset;
  }

  getSortCriteria(): ISortCriteria {
    return {
      col: this.sortColumn,
      asc: this.ascending
    };
  }

  toggleSorting(col:Column) {
    if (this.sortColumn === col) {
      return this.sortBy(col, !this.ascending);
    }
    return this.sortBy(col);
  }

  setSortCriteria(value: ISortCriteria) {
    return this.sortBy(value.col, value.asc);
  }

  sortBy(col:Column, ascending = false) {
    if (col !== null && col.findMyRanker() !== this) {
      return false; //not one of mine
    }
    if (this.sortColumn === col && this.ascending === ascending) {
      return true; //already in this order
    }
    if (this.sortColumn) { //disable dirty listening
      this.sortColumn.on('dirtyValues.order', null);
    }
    var bak = this.getSortCriteria();
    this.sortColumn = col;
    if (this.sortColumn) { //enable dirty listening
      this.sortColumn.on('dirtyValues.order', this.dirtyOrder);
    }
    this.ascending = ascending;
    this.fire(['sortCriteriaChanged', 'dirtyOrder', 'dirtyHeader', 'dirtyValues', 'dirty'], bak, this.getSortCriteria());
    return true;
  }

  get children() {
    return this.columns.slice();
  }

  get length() {
    return this.columns.length;
  }

  insert(col:Column, index:number = this.columns.length) {
    this.columns.splice(index, 0, col);
    col.parent = this;
    this.forward(col, 'dirtyValues.ranking', 'dirtyHeader.ranking', 'dirty.ranking', 'filterChanged.ranking');
    col.on('filterChanged.order', this.dirtyOrder);


    this.fire(['addColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], col, index);

    if (this.sortColumn === null && !(col instanceof RankColumn || col instanceof SelectionColumn || col instanceof DummyColumn)) {
      this.sortBy(col, col instanceof StringColumn);
    }
    return col;
  }

  get fqpath() {
    return '';
  }

  findByPath(fqpath: string): Column {
    var p : IColumnParent|Column = <any>this;
    const indices = fqpath.split('@').map(Number).slice(1); //ignore the first entry = ranking
    while(indices.length > 0) {
      let i = indices.shift();
      p = (<IColumnParent>p).at(i);
    }
    return <Column>p;
  }

  indexOf(col: Column) {
    return this.columns.indexOf(col);
  }

  at(index: number) {
    return this.columns[index];
  }

  insertAfter(col:Column, ref:Column) {
    var i = this.columns.indexOf(ref);
    if (i < 0) {
      return null;
    }
    return this.insert(col, i + 1);
  }

  push(col:Column) {
    return this.insert(col);
  }

  remove(col:Column) {
    var i = this.columns.indexOf(col);
    if (i < 0) {
      return false;
    }

    this.unforward(col, 'dirtyValues.ranking', 'dirtyHeader.ranking', 'dirty.ranking', 'filterChanged.ranking');

    if (this.sortColumn === col) { //was my sorting one
      let next = this.columns.filter((d) => d !== col && !(d instanceof SelectionColumn) && !(d instanceof RankColumn))[0];
      this.sortBy(next ? next : null);
    }

    col.parent = null;
    this.columns.splice(i, 1);

    this.fire(['removeColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], col, i);
    return true;
  }

  clear() {
    if (this.columns.length === 0) {
      return;
    }
    this.sortColumn = null;
    this.columns.forEach((col) => {
      this.unforward(col, 'dirtyValues.ranking', 'dirtyHeader.ranking', 'dirty.ranking', 'filterChanged.ranking');
      col.parent = null;
    });
    this.columns.length = 0;
    this.fire(['removeColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], null);
  }

  get flatColumns() {
    var r:IFlatColumn[] = [];
    this.flatten(r, 0, Column.FLAT_ALL_COLUMNS);
    return r.map((d) => d.col);
  }

  find(id_or_filter:(col:Column) => boolean | string) {
    var filter = typeof(id_or_filter) === 'string' ? (col) => col.id === id_or_filter : id_or_filter;
    var r = this.flatColumns;
    for (var i = 0; i < r.length; ++i) {
      if (filter(r[i])) {
        return r[i];
      }
    }
    return null;
  }

  /**
   * converts the sorting criteria to a json compatible notation for transferring it to the server
   * @param toId
   * @return {any}
   */
  toSortingDesc(toId:(desc:any) => string) {
    //TODO describe also all the filter settings
    var resolve = (s:Column):any => {
      if (s === null) {
        return null;
      }
      if (s instanceof StackColumn) {
        var w = (<StackColumn>s).getWeights();
        return (<StackColumn>s).children.map((child, i) => {
          return {
            weight: w[i],
            id: resolve(child)
          };
        });
      }
      return toId(s.desc);
    };
    var id = resolve(this.sortColumn);
    if (id === null) {
      return null;
    }
    return {
      id: id,
      asc: this.ascending
    };
  }

  isFiltered() {
    return this.columns.some((d) => d.isFiltered());
  }

  filter(row:any) {
    return this.columns.every((d) => d.filter(row));
  }

  findMyRanker() {
    return this;
  }

  get fqid() {
    return this.id;
  }
}

/**
 * defines a new column type
 * @param name
 * @param functions
 * @returns {CustomColumn}
 */
export function defineColumn<T>(name: string, functions: any = {}) {
  class CustomColumn extends ValueColumn<T> {
    constructor(id:string, desc:IColumnDesc) {
      super(id, desc);
      if (typeof (this.init) === 'function') {
        this.init.apply(this, [].slice.apply(arguments));
      }
    }
  }
  CustomColumn.prototype.toString = () => name;
  CustomColumn.prototype = merge(CustomColumn.prototype, functions);

  return CustomColumn;
}

/**
 * utility for creating a stacked column description
 * @type {function(string=): {type: string, label: string}}
 */
export const createStackDesc = StackColumn.desc;
export const createRankDesc = RankColumn.desc;
export const createSelectionDesc = SelectionColumn.desc;
export const createMinDesc = MinColumn.desc;
export const createMaxDesc = MaxColumn.desc;
export const createMeanDesc = MeanColumn.desc;
export const createNestedDesc = NestedColumn.desc;
export const createScriptDesc = ScriptColumn.desc;
/**
 * utility for creating an action description with optional label
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createActionDesc(label = 'actions') {
  return {type: 'actions', label: label};
}

/**
 * a map of all known column types
 */
export function models() {
  return {
    number: NumberColumn,
    string: StringColumn,
    link: LinkColumn,
    stack: StackColumn,
    rank: RankColumn,
    boolean: BooleanColumn,
    categorical: CategoricalColumn,
    ordinal: CategoricalNumberColumn,
    actions: DummyColumn,
    annotate: AnnotateColumn,
    selection: SelectionColumn,

    max: MaxColumn,
    min: MinColumn,
    mean: MinColumn,
    script: ScriptColumn,
    nested: NestedColumn
  };
}
