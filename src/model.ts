/**
 * Created by Samuel Gratzl on 06.08.2015.
 */
///<reference path='../typings/tsd.d.ts' />

import d3 = require('d3');
import utils = require('./utils');
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
  insertAfter(col:Column, reference:Column): boolean;
  findMyRanker() : Ranking;
  fqid: string;
}

export interface IColumnDesc {
  label:string;
  /**
   * the column type
   */
  type:string;
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

/**
 * a column in LineUp
 */
export class Column extends utils.AEventDispatcher {
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
  private width_:number = 100;

  parent:IColumnParent = null;

  label:string;
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
  private _compressed = false;

  constructor(id:string, public desc:IColumnDesc) {
    super();
    this.id = fixCSS(id);
    this.label = this.desc.label || this.id;
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

  /**
   * fires:
   *  * widthChanged
   *  * filterChanged
   *  * labelChanged,
   *  * compressChanged
   *  * addColumn, removeColumn ... for composite pattern
   *  * dirty, dirtyHeader, dirtyValues
   * @returns {string[]}
   */
  createEventList() {
    return super.createEventList().concat(['widthChanged', 'filterChanged', 'labelChanged', 'compressChanged', 'addColumn', 'removeColumn', 'dirty', 'dirtyHeader', 'dirtyValues']);
  }

  getWidth() {
    return this.width_;
  }

  set compressed(value:boolean) {
    if (this._compressed === value) {
      return;
    }
    this.fire(['compressChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this._compressed, this._compressed = value);
  }

  get compressed() {
    return this._compressed;
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
    if (this.width_ === value) {
      return;
    }
    this.fire(['widthChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this.width_, this.width_ = value);
  }

  setWidthImpl(value:number) {
    this.width_ = value;
  }

  setMetaData(value:string, color:string = this.color) {
    if (value === this.label && this.color === color) {
      return;
    }
    var events = this.color === color ? ['labelChanged', 'dirtyHeader', 'dirty'] : ['labelChanged', 'dirtyHeader', 'dirtyValues', 'dirty'];
    this.fire(events, {label: this.label, color: this.color}, {
      label: this.label = value,
      color: this.color = color
    });
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
      return this.parent.insertAfter(col, this);
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
      width: this.width_,
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
    this.width_ = dump.width || this.width_;
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
  compare(a:any[], b:any[]) {
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

  compare(a:any[], b:any[]) {
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

  compare(a:any[], b:any[]) {
    return 0; //can't compare
  }
}

export interface INumberColumn {
  getNumber(row:any): number;
}

export interface ICategoricalColumn {
  categories: string[];

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
  private filter_ = {min: -Infinity, max: Infinity};

  constructor(id:string, desc:any) {
    super(id, desc);

    if (desc.map) {
      this.mapping = createMappingFunction(desc.map);
    } else if (desc.domain) {
      this.mapping = new ScaleMappingFunction(desc.domain, 'linear', desc.range || [0,1]);
    }
    this.original = this.mapping.clone();
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
    r.filter = this.filter;
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
    if (dump.filter) {
      this.filter_ = dump.filter;
    }
    if (dump.missingValue) {
      this.missingValue = dump.missingValue;
    }
  }

  createEventList() {
    return super.createEventList().concat(['mappingChanged']);
  }

  getLabel(row:any) {
    return '' + super.getValue(row);
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

  compare(a:any[], b:any[]) {
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
    return isFinite(this.filter_.min) || isFinite(this.filter_.max);
  }

  get filterMin() {
    return this.filter_.min;
  }

  get filterMax() {
    return this.filter_.max;
  }

  getFilter() {
    return this.filter_;
  }

  set filterMin(min:number) {
    var bak = {min: this.filter_.min, max: this.filter_.max};
    this.filter_.min = isNaN(min) ? -Infinity : min;
    this.fire(['filterChanged', 'dirtyValues', 'dirty'], bak, this.filter_);
  }

  set filterMax(max:number) {
    var bak = {min: this.filter_.min, max: this.filter_.max};
    this.filter_.max = isNaN(max) ? Infinity : max;
    this.fire(['filterChanged', 'dirtyValues', 'dirty'], bak, this.filter_);
  }

  setFilter(min:number = -Infinity, max:number = +Infinity) {
    var bak = {min: this.filter_.min, max: this.filter_.max};
    this.filter_.min = isNaN(min) ? -Infinity : min;
    this.filter_.max = isNaN(max) ? Infinity : max;
    this.fire(['filterChanged', 'dirtyValues', 'dirty'], bak, this.filter_);
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
    return !((isFinite(this.filter_.min) && v < this.filter_.min) || (isFinite(this.filter_.max) && v < this.filter_.max));
  }
}

/**
 * a string column with optional alignment
 */
export class StringColumn extends ValueColumn<string> {
  private filter_:string|RegExp = null;

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
    return v;
  }

  dump(toDescRef:(desc:any) => any):any {
    var r = super.dump(toDescRef);
    if (this.filter_ instanceof RegExp) {
      r.filter = 'REGEX:' + (<RegExp>this.filter_).source;
    } else {
      r.filter = this.filter_;
    }
    r.alignment = this.alignment;
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    super.restore(dump, factory);
    if (dump.filter && dump.filter.slice(0, 6) === 'REGEX:') {
      this.filter_ = new RegExp(dump.filter.slice(6));
    } else {
      this.filter_ = dump.filter || null;
    }
    this._alignment = dump.alignment || this._alignment;
  }

  isFiltered() {
    return this.filter_ != null;
  }

  filter(row:any) {
    if (!this.isFiltered()) {
      return true;
    }
    var r = this.getLabel(row),
      filter = this.filter_;
    if (typeof filter === 'string' && filter.length > 0) {
      return r && r.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
    }
    if (filter instanceof RegExp) {
      return r && filter.test(r);
    }
    return true;
  }

  getFilter() {
    return this.filter_;
  }

  setFilter(filter:string|RegExp) {
    if (filter === '') {
      filter = null;
    }
    this.fire(['filterChanged', 'dirtyValues', 'dirty'], this.filter_, this.filter_ = filter);
  }

  compare(a:any[], b:any[]) {
    return d3.ascending(this.getValue(a), this.getValue(b));
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
    this.fire(['dirtyValues', 'dirty'], value, old);
    return true;
  }
}


/**
 * a checkbox column for selections
 */
export class SelectionColumn extends ValueColumn<boolean> {

  constructor(id:string, desc:any) {
    super(id, desc);
    this.compressed = true;
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
   * set of categories to show
   * @type {null}
   * @private
   */
  private filter_:string[] = null;

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
        cols = this.colors.range();
      desc.categories.forEach((cat, i) => {
        if (typeof cat === 'string') {
          cats.push(cat);
        } else {
          cats.push(cat.name);
          cols[i] = cat.color;
        }
      });
      this.colors.domain(cats).range(cols);
    }
  }

  get categories() {
    return this.colors.domain();
  }

  get categoryColors() {
    return this.colors.range();
  }

  colorOf(cat: string) {
    return this.colors(cat);
  }

  getLabel(row:any) {
    return '' + StringColumn.prototype.getValue.call(this, row);
  }

  getFirstLabel(row:any) {
    const l = this.getLabels(row);
    return l.length > 0 ? l[0] : null;
  }

  getLabels(row:any) {
    var v = StringColumn.prototype.getValue.call(this, row);
    const r = v.split(this.separator);
    return r;
  }

  getValue(row:any) {
    const r = this.getValues(row);
    return r.length > 0 ? r[0] : null;
  }

  getValues(row:any) {
    var v = StringColumn.prototype.getValue.call(this, row);
    const r = v.split(this.separator);
    return r;
  }

  getCategories(row: any) {
    return this.getValues(row);
  }

  getColor(row:any) {
    var cat = this.getFirstLabel(row);
    if (cat === null || cat === '') {
      return null;
    }
    return this.colors(cat);
  }

  getColors(row:any) {
    return this.getLabels(row).map(this.colors);
  }

  dump(toDescRef:(desc:any) => any):any {
    var r = super.dump(toDescRef);
    r.filter = this.filter_;
    r.colors = {
      domain: this.colors.domain(),
      range: this.colors.range(),
      separator: this.separator
    };
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    super.restore(dump, factory);
    this.filter_ = dump.filter || null;
    if (dump.colors) {
      this.colors.domain(dump.colors.domain).range(dump.colors.range);
    }
    this.separator = dump.separator || this.separator;
  }

  isFiltered() {
    return this.filter_ != null;
  }

  filter(row:any):boolean {
    if (!this.isFiltered()) {
      return true;
    }
    var vs = this.getValues(row),
      filter:any = this.filter_;
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
    return this.filter_;
  }

  setFilter(filter:string[]) {
    this.fire(['filterChanged', 'dirtyValues', 'dirty'], this, this.filter_, this.filter_ = filter);
  }

  compare(a:any[], b:any[]) {
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
  private scale = d3.scale.ordinal().rangeRoundPoints([0, 1]);

  private filter_:string = null;
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
      var values = [];
      desc.categories.forEach((d) => {
        if (typeof d !== 'string' && typeof (d.value) === 'number') {
          values.push(d.value);
        } else {
          values.push(0.5); //by default 0.5
        }
      });
      this.scale.range(values);
    }
  }

  createEventList() {
    return super.createEventList().concat(['mappingChanged']);
  }

  get categories() {
    return this.colors.domain();
  }

  get categoryColors() {
    return this.colors.range();
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

  setRange(range:number[]) {
    var bak = this.getScale();
    this.scale.range(range);
    this.fire(['mappingChanged', 'dirtyValues', 'dirty'], bak, this.getScale());
  }

  isFiltered() {
    return this.filter_ != null;
  }

  filter(row:any):boolean {
    return CategoricalColumn.prototype.filter.call(this, row);
  }

  getFilter() {
    return this.filter_;
  }

  setFilter(filter:string) {
    this.fire(['filterChanged', 'dirtyValues', 'dirty'], this.filter_, this.filter_ = filter);
  }

  compare(a:any[], b:any[]) {
    return NumberColumn.prototype.compare.call(this, a, b);
  }
}

/**
 * implementation of the stacked column
 */
export class StackColumn extends Column implements IColumnParent, INumberColumn {
  /**
   * factory for creating a description creating a stacked column
   * @param label
   * @returns {{type: string, label: string}}
   */
  static desc(label:string = 'Combined') {
    return {type: 'stack', label: label};
  }

  public missingValue = 0;
  private children_:Column[] = [];

  private adaptChange;

  /**
   * whether this stack column is collapsed i.e. just looks like an ordinary number column
   * @type {boolean}
   * @private
   */
  private _collapsed = false;

  constructor(id:string, desc:any) {
    super(id, desc);

    var that = this;
    this.adaptChange = function (old, new_) {
      that.adaptWidthChange(this.source, old, new_);
    };
  }

  createEventList() {
    return super.createEventList().concat(['collapseChanged']);
  }

  assignNewId(idGenerator:() => string) {
    super.assignNewId(idGenerator);
    this.children_.forEach((c) => c.assignNewId(idGenerator));
  }

  get children() {
    return this.children_.slice();
  }

  get length() {
    return this.children_.length;
  }

  get weights() {
    var w = this.getWidth();
    return this.children_.map((d) => d.getWidth() / w);
  }

  set collapsed(value:boolean) {
    if (this._collapsed === value) {
      return;
    }
    this.fire(['collapseChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this._collapsed, this._collapsed = value);
  }

  get collapsed() {
    return this._collapsed;
  }

  flatten(r:IFlatColumn[], offset:number, levelsToGo = 0, padding = 0) {
    var self = null;
    //no more levels or just this one
    if (levelsToGo === 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      var w = this.compressed ? Column.COMPRESSED_WIDTH : this.getWidth();
      if (!this.collapsed && !this.compressed) {
        w += (this.children_.length - 1) * padding;
      }
      r.push(self = {col: this, offset: offset, width: w});
      if (levelsToGo === 0) {
        return w;
      }
    }
    //push children
    var acc = offset;
    this.children_.forEach((c) => {
      acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
    });
    if (self) { //nesting my even increase my width
      self.width = acc - offset - padding;
    }
    return acc - offset - padding;
  }

  dump(toDescRef:(desc:any) => any) {
    var r = super.dump(toDescRef);
    r.children = this.children_.map((d) => d.dump(toDescRef));
    r.missingValue = this.missingValue;
    r.collapsed = this.collapsed;
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    if (dump.missingValue) {
      this.missingValue = dump.missingValue;
    }
    dump.children.map((child) => {
      var c = factory(child);
      if (c) {
        this.push(c);
      }
    });
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
    if (!isNumberColumn(col)) { //indicator it is a number type
      return null;
    }
    if (col instanceof StackColumn) {
      //STACK col.collapsed = true;
    }
    if (!isNaN(weight)) {
      col.setWidth((weight / (1 - weight) * this.getWidth()));
    }

    this.children_.splice(index, 0, col);
    //listen and propagate events
    col.parent = this;
    this.forward(col, 'dirtyHeader.stack', 'dirtyValues.stack', 'dirty.stack', 'filterChanged.stack');
    col.on('widthChanged.stack', this.adaptChange);

    //increase my width
    super.setWidth(this.children_.length === 1 ? col.getWidth() : (this.getWidth() + col.getWidth()));
    this.fire(['addColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], col, col.getWidth() / this.getWidth(), index);
    return true;
  }

  push(col:Column, weight = NaN) {
    return this.insert(col, this.children_.length, weight);
  }

  indexOf(col:Column) {
    var j = -1;
    this.children_.some((d, i) => {
      if (d === col) {
        j = i;
        return true;
      }
      return false;
    });
    return j;
  }

  insertAfter(col:Column, ref:Column, weight = NaN) {
    var i = this.indexOf(ref);
    if (i < 0) {
      return false;
    }
    return this.insert(col, i + 1, weight);
  }

  /**
   * adapts weights according to an own width change
   * @param col
   * @param old
   * @param new_
   */
  private adaptWidthChange(col:Column, old, new_) {
    if (old === new_) {
      return;
    }
    var full = this.getWidth(),
      change = (new_ - old) / full;
    var oldWeight = old / full;
    var factor = (1 - oldWeight - change) / (1 - oldWeight);
    this.children_.forEach((c) => {
      if (c === col) {
        //c.weight += change;
      } else {
        c.setWidthImpl(c.getWidth() * factor);
      }
    });
    this.fire(['widthChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], full, full);
  }

  setWeights(weights:number[]) {
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

    this.children_.forEach((c, i) => {
      c.setWidthImpl(weights[i]);
    });
    this.fire(['widthChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this.getWidth(), this.getWidth());

  }

  remove(child:Column) {
    var i = this.children_.indexOf(child);
    if (i < 0) {
      return false;
    }
    this.children_.splice(i, 1); //remove and deregister listeners
    child.parent = null;
    if (child instanceof StackColumn) {
      //STACK (<StackColumn>child).collapsed = false;
    }
    this.unforward(child, 'dirtyHeader.stack', 'dirtyValues.stack', 'dirty.stack', 'filterChanged.stack');
    child.on('widthChanged.stack', null);

    //reduce width to keep the percentages
    super.setWidth(this.length === 0 ? 100 : this.getWidth() - child.getWidth());
    this.fire(['removeColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], child);
    return true;
  }

  setWidth(value:number) {
    var factor = value / this.getWidth();
    this.children_.forEach((child) => {
      //disable since we change it
      child.setWidthImpl(child.getWidth() * factor);
    });
    super.setWidth(value);
  }

  getValue(row:any) {
    //weighted sum
    var w = this.getWidth();
    var v = this.children_.reduce((acc, d) => acc + d.getValue(row) * (d.getWidth() / w), 0);
    if (typeof(v) === 'undefined' || v == null || isNaN(v)) {
      return this.missingValue;
    }
    return v;
  }

  getNumber(row:any) {
    return this.getValue(row);
  }

  compare(a:any[], b:any[]) {
    return numberCompare(this.getValue(a), this.getValue(b));
  }

  isFiltered() {
    return this.children_.some((d) => d.isFiltered());
  }

  filter(row:any) {
    return this.children_.every((d) => d.filter(row));
  }

  /*static merge(a: Column, b: Column) {
   if ((typeof a['getNumber'] !== 'function') || (typeof b['getNumber'] !== 'function')) {
   return false;
   }
   if (a instanceof StackColumn) {
   return (<StackColumn>a).push(b);
   } else if (b instanceof StackColumn) {
   a.parent.replace(a, b);
   return (<StackColumn>b).push(a);
   } else {
   return false; //not yet possible
   }
   }*/
}

/**
 * a rank column
 */
export class RankColumn extends ValueColumn<number> {
  constructor(id:string, desc:any) {
    super(id, desc);
    this.setWidthImpl(50);
  }
}


/**
 * a ranking
 */
export class Ranking extends utils.AEventDispatcher implements IColumnParent {

  /**
   * the current sort criteria
   * @type {null}
   * @private
   */
  private sortBy_:Column = null;
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
  private columns_:Column[] = [];

  comparator = (a:any[], b:any[]) => {
    if (this.sortBy_ === null) {
      return 0;
    }
    var r = this.sortBy_.compare(a, b);
    return this.ascending ? r : -r;
  };

  dirtyOrder = () => {
    this.fire(['dirtyOrder', 'dirtyValues', 'dirty'], this.sortCriteria());
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
    this.columns_.forEach((c) => c.assignNewId(idGenerator));
  }

  setOrder(order:number[]) {
    this.fire(['orderChanged', 'dirtyValues', 'dirty'], this.order, this.order = order);
  }

  getOrder() {
    return this.order;
  }

  dump(toDescRef:(desc:any) => any) {
    var r : any = {};
    r.columns = this.columns_.map((d) => d.dump(toDescRef));
    r.sortCriteria = {
      asc: this.ascending
    };
    if (this.sortBy_) {
      r.sortCriteria.sortBy = this.sortBy_.id; //store the index not the object
    }
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    dump.columns.map((child) => {
      var c = factory(child);
      if (c) {
        this.push(c);
      }
    });
    if (dump.sortCriteria) {
      this.ascending = dump.sortCriteria.asc;
      if (dump.sortCriteria.sortBy) {
        let help = this.columns_.filter((d) => d.id === dump.sortCriteria.sortBy);
        this.sortBy(help.length === 0 ? null : help[0], dump.sortCriteria.asc);
      }
    }
  }

  flatten(r:IFlatColumn[], offset:number, levelsToGo = 0, padding = 0) {
    var acc = offset; // + this.getWidth() + padding;
    if (levelsToGo > 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      this.columns_.forEach((c) => {
        acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
      });
    }
    return acc - offset;
  }

  sortCriteria() {
    return {
      col: this.sortBy_,
      asc: this.ascending
    };
  }

  toggleSorting(col:Column) {
    if (this.sortBy_ === col) {
      return this.sortBy(col, !this.ascending);
    }
    return this.sortBy(col);
  }

  sortBy(col:Column, ascending = false) {
    if (col !== null && col.findMyRanker() !== this) {
      return false; //not one of mine
    }
    if (this.sortBy_ === col && this.ascending === ascending) {
      return true; //already in this order
    }
    if (this.sortBy_) { //disable dirty listening
      this.sortBy_.on('dirtyValues.order', null);
    }
    var bak = this.sortCriteria();
    this.sortBy_ = col;
    if (this.sortBy_) { //enable dirty listening
      this.sortBy_.on('dirtyValues.order', this.dirtyOrder);
    }
    this.ascending = ascending;
    this.fire(['sortCriteriaChanged', 'dirtyOrder', 'dirtyHeader', 'dirtyValues', 'dirty'], bak, this.sortCriteria());
    return true;
  }

  get children() {
    return this.columns_.slice();
  }

  get length() {
    return this.columns_.length;
  }

  insert(col:Column, index:number = this.columns_.length) {
    this.columns_.splice(index, 0, col);
    col.parent = this;
    this.forward(col, 'dirtyValues.ranking', 'dirtyHeader.ranking', 'dirty.ranking', 'filterChanged.ranking');
    col.on('filterChanged.order', this.dirtyOrder);


    this.fire(['addColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], col, index);

    if (this.sortBy_ === null && !(col instanceof RankColumn || col instanceof SelectionColumn || col instanceof DummyColumn)) {
      this.sortBy(col);
    }
    return col;
  }

  insertAfter(col:Column, ref:Column) {
    var i = this.columns_.indexOf(ref);
    if (i < 0) {
      return false;
    }
    return this.insert(col, i + 1) != null;
  }

  push(col:Column) {
    return this.insert(col);
  }

  remove(col:Column) {
    var i = this.columns_.indexOf(col);
    if (i < 0) {
      return false;
    }

    this.unforward(col, 'dirtyValues.ranking', 'dirtyHeader.ranking', 'dirty.ranking', 'filterChanged.ranking');

    col.parent = null;
    this.columns_.splice(i, 1);
    this.fire(['removeColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], col);
    if (this.sortBy_ === col) { //was my sorting one
      this.sortBy(this.columns_.length > 0 ? this.columns_[0] : null);
    }
    return true;
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
   * converts the sorting criteria to a json compatible notation for transfering it to the server
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
        var w = (<StackColumn>s).weights;
        return (<StackColumn>s).children.map((child, i) => {
          return {
            weight: w[i],
            id: resolve(child)
          };
        });
      }
      return toId(s.desc);
    };
    var id = resolve(this.sortBy_);
    if (id === null) {
      return null;
    }
    return {
      id: id,
      asc: this.ascending
    };
  }

  isFiltered() {
    return this.columns_.some((d) => d.isFiltered());
  }

  filter(row:any) {
    return this.columns_.every((d) => d.filter(row));
  }

  findMyRanker() {
    return this;
  }

  get fqid() {
    return this.id;
  }
}

/**
 * utility for creating a stacked column description
 * @type {function(string=): {type: string, label: string}}
 */
export const createStackDesc = StackColumn.desc;
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
    categorical: CategoricalColumn,
    ordinal: CategoricalNumberColumn,
    actions: DummyColumn,
    annotate: AnnotateColumn,
    selection: SelectionColumn
  };
}
