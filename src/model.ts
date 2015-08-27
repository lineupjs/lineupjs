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

export interface IColumnParent extends Column {
  remove(col: Column): boolean;
  insertAfter(col: Column, reference: Column): boolean;
}

/**
 * a column in LineUp
 */
export class Column extends utils.AEventDispatcher {
  static DEFAULT_COLOR = 'gray';
  static FLAT_ALL_COLUMNS = -1;

  public id:string;

  private width_:number = 100;

  parent: IColumnParent = null;

  label: string;

  constructor(id:string, public desc:any) {
    super();
    this.id = fixCSS(id);
    this.label = this.desc.label || this.id;
  }

  get fqid() {
    return this.parent ? this.parent.fqid +'_'+this.id : this.id;
  }

  createEventList() {
    return super.createEventList().concat(['widthChanged', 'filterChanged', 'labelChanged', 'addColumn', 'removeColumn', 'dirty', 'dirtyHeader', 'dirtyValues']);
  }

  getWidth() {
    return this.width_;
  }

  flatten(r: IFlatColumn[], offset: number, levelsToGo = 0, padding = 0): number {
    r.push({ col: this, offset: offset, width: this.getWidth() });
    return this.getWidth();
  }

  setWidth(value:number) {
    if (this.width_ === value) {
      return;
    }
    this.fire(['widthChanged','dirtyHeader','dirtyValues','dirty'], this.width_, this.width_ = value);
  }

  setWidthImpl(value: number) {
    this.width_ = value;
  }

  setLabel(value: string) {
    if (value === this.label) {
      return;
    }
    this.fire(['labelChanged', 'dirtyHeader','dirty'], this.label, this.label = value);
  }

  get color() {
    return this.desc.color || Column.DEFAULT_COLOR;
  }

  sortByMe(ascending = false) {
    var r = this.findMyRanker();
    if (r) {
      return r.sortBy(this, ascending);
    }
    return false;
  }
  toggleMySorting() {
    var r = this.findMyRanker();
    if (r) {
      return r.toggleSorting(this);
    }
    return false;
  }
  removeMe() {
    if (this.parent) {
      return this.parent.remove(this);
    }
    return false;
  }
  insertAfterMe(col: Column) {
    if (this.parent) {
      return this.parent.insertAfter(col, this);
    }
    return false;
  }

  findMyRanker() {
    if (this.parent) {
      return this.parent.findMyRanker();
    }
    return null;
  }

  dump(toDescRef: (desc: any) => any) : any {
    var r: any = {
      id: this.id,
      desc: toDescRef(this.desc),
      width: this.width_,
    };
    if (this.label !== (this.desc.label || this.id)) {
      r.label = this.label;
    }
    return r;
  }

  restore(dump: any, factory : (dump: any) => Column) {
    this.width_ = dump.width || this.width_;
    this.label = dump.label || this.label;
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
  accessor:(row:any, id:string, desc:any) => T;

  constructor(id:string, desc:any) {
    super(id, desc);
    this.accessor = desc.accessor || ((row:any, id:string, desc:any) => null);
  }

  getLabel(row:any) {
    return '' + this.getValue(row);
  }

  getValue(row:any) {
    return this.accessor(row, this.id, this.desc);
  }

  compare(a:any[], b:any[]) {
    return 0; //can't compare
  }
}

export interface INumberColumn {
  getNumber(row: any): number;
}

export function isNumberColumn(col: Column) {
  return typeof (<any>col).getNumber === 'function';
}

export class NumberColumn extends ValueColumn<number> implements INumberColumn {
  missingValue = NaN;
  private scale = d3.scale.linear().domain([NaN, NaN]).range([0, 1]).clamp(true);
  private mapping = d3.scale.linear().domain([NaN, NaN]).range([0, 1]).clamp(true);

  private filter_ = {min: -Infinity, max: Infinity};

  constructor(id:string, desc:any) {
    super(id, desc);
    if (desc.domain) {
      this.scale.domain(desc.domain);
    }
    if (desc.range) {
      this.scale.range(desc.range);
    }
    //TODO infer scales from data
    this.mapping.domain(this.scale.domain()).range(this.scale.range());
  }

  dump(toDescRef: (desc: any) => any) {
    var r = super.dump(toDescRef);
    r.domain = this.scale.domain();
    r.range = this.scale.range();
    r.mapping = this.getMapping();
    r.filter = this.filter;
    r.missingValue = this.missingValue;
    return r;
  }

  restore(dump: any, factory : (dump: any) => Column) {
    super.restore(dump, factory);
    if (dump.domain) {
      this.scale.domain(dump.domain);
    }
    if (dump.range) {
      this.scale.range(dump.range);
    }
    if (dump.mapping) {
      this.mapping.domain(dump.mapping.domain).range(dump.mapping.range);
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
    return this.scale(v);
  }

  getNumber(row: any) {
    return this.getValue(row);
  }

  compare(a:any[], b:any[]) {
    return numberCompare(this.getValue(a), this.getValue(b));
  }

  getMapping() {
    return {
      domain: <[number, number]>this.mapping.domain(),
      range: <[number, number]>this.mapping.range()
    };
  }

  getOriginalMapping() {
    return {
      domain: <[number, number]>this.mapping.domain(),
      range: <[number, number]>this.mapping.range()
    };
  }

  setMapping(domain: [number, number], range: [number, number]) {
    var bak = this.getMapping();
    this.mapping.domain(domain).range(range);
    this.fire(['mappingChanged', 'dirtyValues', 'dirty'], bak, this.getMapping());
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

export class StringColumn extends ValueColumn<string> {
  private filter_ : string = null;

  constructor(id:string, desc:any) {
    super(id, desc);
  }

  getValue(row:any) {
    var v:any = super.getValue(row);
    if (typeof(v) === 'undefined' || v == null) {
      return '';
    }
    return v;
  }

  dump(toDescRef: (desc: any) => any) : any {
    var r = super.dump(toDescRef);
    r.filter = this.filter_;
    return r;
  }

  restore(dump: any, factory : (dump: any) => Column) {
    super.restore(dump, factory);
    this.filter_ = dump.filter || null;
  }

  isFiltered() {
    return this.filter_ != null;
  }

  filter(row: any) {
    if (!this.isFiltered()) {
      return true;
    }
    var r = this.getLabel(row),
      filter = this.filter_;
    if (typeof filter === 'string' && filter.length > 0) {
      return r && r.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
    }
    return true;
  }

  getFilter() {
    return this.filter_;
  }

  setFilter(filter: string) {
    if (filter === '') {
      filter = null;
    }
    this.fire(['filterChanged','dirtyValues','dirty'], this.filter_, this.filter_ = filter);
  }

  compare(a:any[], b:any[]) {
    return d3.ascending(this.getValue(a), this.getValue(b));
  }
}

export class LinkColumn extends StringColumn {
  private link = null;
  constructor(id:string, desc:any) {
    super(id, desc);
    this.link = desc.link;
  }

  getLabel(row:any) {
    var v:any = super.getValue(row);
    if (v.alt) {
      return v.alt;
    }
    return '' + v;
  }

  getValue(row:any) {
    var v:any = super.getValue(row);
    if (v.href) {
      return v.href;
    } else if (this.link) {
      return this.link.replace(/\$1/g , v);
    }
    return v;
  }
}

export class CategoricalColumn extends ValueColumn<string> {
  private colors = d3.scale.category10();

  private filter_ : string[] = null;

  constructor(id:string, desc:any) {
    super(id, desc);
    this.init(desc);
    //TODO infer categories from data
  }

  init(desc: any) {
    if (desc.categories) {
      var cats = [],
        cols = this.colors.range();
      desc.categories.forEach((cat,i) => {
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

  getValue(row:any) {
    return StringColumn.prototype.getValue.call(this, row);
  }

  getColor(row) {
    var cat = this.getLabel(row);
    if (cat === null || cat === '') {
      return null;
    }
    return this.colors(cat);
  }

  dump(toDescRef: (desc: any) => any) : any {
    var r = super.dump(toDescRef);
    r.filter = this.filter_;
    r.colors = {
      domain: this.colors.domain(),
      range: this.colors.range()
    };
    return r;
  }

  restore(dump: any, factory : (dump: any) => Column) {
    super.restore(dump, factory);
    this.filter_ = dump.filter || null;
    if (dump.colors) {
      this.colors.domain(dump.colors.domain).range(dump.colors.range);
    }
  }

  isFiltered() {
    return this.filter_ != null;
  }

  filter(row: any) : boolean {
    if (!this.isFiltered()) {
      return true;
    }
    var r = this.getLabel(row),
      filter: any = this.filter_;
    if (Array.isArray(filter) && filter.length > 0) {
      return filter.indexOf(r) >= 0;
    } else if (typeof filter === 'string' && filter.length > 0) {
      return r && r.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
    } else if (filter instanceof RegExp) {
      return r != null && r.match(filter).length > 0;
    }
    return true;
  }

  getFilter() {
    return this.filter_;
  }

  setFilter(filter: string[]) {
    this.fire(['filterChanged','dirtyValues','dirty'], this, this.filter_, this.filter_ = filter);
  }

  compare(a:any[], b:any[]) {
    return StringColumn.prototype.compare.call(this, a, b);
  }
}

export class CategoricalNumberColumn extends ValueColumn<number> implements INumberColumn{
  private colors = d3.scale.category10();
  private scale = d3.scale.ordinal().rangeRoundPoints([0,1]);

  private filter_ : string = null;

  constructor(id:string, desc:any) {
    super(id, desc);
    CategoricalColumn.prototype.init.call(this, desc);

    this.scale.domain(this.colors.domain());
    if (desc.categories) {
      var values = [];
      desc.categories.forEach((d) => {
        if (typeof d !== 'string' && typeof (d.value) === 'number') {
          values.push(d.value);
        } else {
          values.push(0.5);
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

  getLabel(row:any) {
    var v:any = super.getValue(row);
    if (typeof(v) === 'undefined' || v == null) {
      return '';
    }
    return v;
  }

  getValue(row:any) {
    var v = this.getLabel(row);
    return this.scale(v);
  }

  getNumber(row: any) {
    return this.getValue(row);
  }

  getColor(row) {
    return CategoricalColumn.prototype.getColor.call(this, row);
  }

  dump(toDescRef: (desc: any) => any) : any {
    var r = CategoricalColumn.prototype.dump.call(this, toDescRef);
    r.scale = {
      domain: this.scale.domain(),
      range: this.scale.range()
    };
    return r;
  }

  restore(dump: any, factory : (dump: any) => Column) {
    CategoricalColumn.prototype.restore.call(this, dump, factory);
    if (dump.scale) {
      this.scale.domain(dump.scale.domain).range(dump.scale.range);
    }
  }

  getScale() {
    return {
      domain: this.scale.domain(),
      range: this.scale.range()
    };
  }

  setRange(range: number[]) {
    var bak = this.getScale();
    this.scale.range(range);
    this.fire(['mappingChanged','dirtyValues','dirty'], bak, this.getScale());
  }

  isFiltered() {
    return this.filter_ != null;
  }

  filter(row: any) : boolean {
    return CategoricalColumn.prototype.filter.call(this, row);
  }

  getFilter() {
    return this.filter_;
  }

  setFilter(filter: string) {
    this.fire(['filterChanged','dirtyValues','dirty'], this.filter_, this.filter_ = filter);
  }

  compare(a:any[], b:any[]) {
    return NumberColumn.prototype.compare.call(this, a, b);
  }
}

/**
 * implementation of the stacked colum
 */
export class StackColumn extends Column implements IColumnParent, INumberColumn {
  static desc(label: string = 'Combined') {
    return { type: 'stack', label : label };
  }

  public missingValue = NaN;
  private children_:Column[] = [];

  private adaptChange;

  private _collapsed = false;

  constructor(id:string, desc:any) {
    super(id, desc);

    var that = this;
    this.adaptChange = function(old, new_) {
      that.adaptWidthChange(this.source, old, new_);
    };
  }

  createEventList() {
    return super.createEventList().concat(['collapseChanged']);
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

  set collapsed(value: boolean) {
    if (this._collapsed === value) {
      return;
    }
    this.fire(['collapseChanged', 'dirtyHeader', 'dirty'], this._collapsed, this._collapsed = value);
  }

  get collapsed() {
    return this._collapsed;
  }

  flatten(r: IFlatColumn[], offset: number, levelsToGo = 0, padding = 0) {
    if (levelsToGo === 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      var w = this.getWidth();
      if (!this.collapsed) {
        w += (this.children_.length-1)*padding;
      }
      r.push({col: this, offset: offset, width: w});
      if (levelsToGo === 0) {
        return w;
      }
    }

    var acc = offset;
    this.children_.forEach((c) => {
      acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
    });
    return acc - offset - padding;
  }

  dump(toDescRef: (desc: any) => any) {
    var r = super.dump(toDescRef);
    r.children = this.children_.map((d) => d.dump(toDescRef));
    r.missingValue = this.missingValue;
    return r;
  }

  restore(dump: any, factory : (dump: any) => Column) {
    if (dump.missingValue) {
      this.missingValue = dump.missingValue;
    }
    dump.children.map((child) => {
      this.push(factory(child));
    });
    super.restore(dump, factory);
  }

  insert(col: Column, index: number, weight = NaN) {
    if (!isNumberColumn(col)) { //indicator it is a number type
      return null;
    }
    if (col instanceof StackColumn) {
      col.collapsed = true;
    }
    if (!isNaN(weight)) {
      col.setWidth((weight/(1-weight)*this.getWidth()));
    }

    this.children_.splice(index, 0, col);
    //listen and propagate events
    col.parent = this;
    this.forward(col, 'dirtyHeader.stack','dirtyValues.stack','dirty.stack','filterChanged.stack');
    col.on('widthChanged.stack', this.adaptChange);

    //increase my width
    super.setWidth(this.children_.length === 1 ? col.getWidth() : (this.getWidth() + col.getWidth()));
    this.fire(['addColumn','dirtyHeader','dirtyValues','dirty'], col, col.getWidth() / this.getWidth());
    return true;
  }

  push(col:Column, weight = NaN) {
    return this.insert(col, this.children_.length, weight);
  }

  indexOf(col: Column) {
    var j = -1;
    this.children_.some((d,i) => {
        if (d === col) {
          j = i;
          return true;
        }
        return false;
      });
    return j;
  }

  insertAfter(col: Column, ref: Column, weight = NaN) {
    var i = this.indexOf(ref);
    if (i < 0) {
      return false;
    }
    return this.insert(col, i+1, weight);
  }

  private adaptWidthChange(col: Column, old, new_) {
    if (old === new_) {
      return;
    }
    var full = this.getWidth(),
      change = (new_ - old) / full;
    var oldWeight = old/full;
    var factor = (1-oldWeight-change)/(1-oldWeight);
    this.children_.forEach((c) => {
      if (c === col) {
        //c.weight += change;
      } else {
        c.setWidthImpl(c.getWidth()*factor);
      }
    });
    this.fire(['widthChanged','dirtyHeader','dirtyValues','dirty'], full, full);
  }

  setWeights(weights: number[]) {
    var s,
      delta = weights.length -this.length;
    if (delta < 0) {
      s = d3.sum(weights);
      if (s <= 1) {
        for(var i = 0; i < -delta; ++i) {
          weights.push((1-s)*(1/-delta));
        }
      } else if (s <= 100) {
        for(var i = 0; i < -delta; ++i) {
          weights.push((100-s)*(1/-delta));
        }
      }
    }
    weights = weights.slice(0, this.length);
    s = d3.sum(weights) / this.getWidth();
    weights = weights.map(d => d/s);

    this.children_.forEach((c, i) => {
      c.setWidthImpl(weights[i]);
    });
    this.fire(['widthChanged', 'dirtyHeader', 'dirtyValues','dirty'], this.getWidth(), this.getWidth());

  }

  remove(child:Column) {
    var i = this.children_.indexOf(child);
    if (i < 0) {
      return false;
    }
    this.children_.splice(i, 1); //remove and deregister listeners
    child.parent = null;
    this.unforward(child, 'dirtyHeader.stack','dirtyValues.stack','dirty.stack','filterChanged.stack');
    child.on('widthChanged.stack', null);

    //reduce width to keep the percentages
    super.setWidth(this.length === 0 ? 100 : this.getWidth() - child.getWidth());
    this.fire(['removeColumn','dirtyHeader','dirtyValues','dirty'], child);
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
    var v = this.children_.reduce((acc, d) => acc + d.getValue(row) * (d.getWidth()/w), 0);
    if (typeof(v) === 'undefined' || v == null || isNaN(v)) {
      return this.missingValue;
    }
    return v;
  }

  getNumber(row: any) {
    return this.getValue(row);
  }

  compare(a:any[], b:any[]) {
    return numberCompare(this.getValue(a), this.getValue(b));
  }

  isFiltered() {
    return this.children_.some((d) => d.isFiltered());
  }

  filter(row: any) {
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
 * a rank column is not just a column but a whole ranking
 */
export class RankColumn extends ValueColumn<number> {

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

  private dirtyOrder = () => {
    this.fire(['dirtyOrder','dirtyValues','dirty'],this.sortCriteria());
  };

  private order: number[] = [];

  constructor(id:string, desc:any) {
    super(id, desc);
    this.setWidthImpl(50);
  }

  createEventList() {
    return super.createEventList().concat(['sortCriteriaChanged', 'dirtyOrder', 'orderChanged']);
  }

  setOrder(order: number[]) {
    this.fire(['orderChanged','dirtyValues','dirty'], this.order, this.order = order);
  }

  getOrder() {
    return this.order;
  }

  dump(toDescRef:(desc:any) => any) {
    var r = super.dump(toDescRef);
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
    super.restore(dump, factory);
    dump.columns.map((child) => {
      this.push(factory(child.col));
    });
    if (dump.sortCriteria) {
      this.ascending = dump.sortCriteria.asc;
      if (dump.sortCriteria.sortBy) {
        this.sortBy(this.columns_.filter((d) => d.id === dump.sortCriteria.sortBy)[0], dump.sortCriteria.asc);
      }
    }
  }

  flatten(r:IFlatColumn[], offset:number, levelsToGo = 0, padding = 0) {
    r.push({col: this, offset: offset, width: this.getWidth()});
    var acc = offset + this.getWidth() + padding;
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

  sortByMe(ascending = false) {
    //noop
  }

  toggleMySorting() {
    //noop
  }

  findMyRanker() {
    return this;
  }

  insertAfterMe(col: Column) {
    return this.insert(col, 0) !== null;
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
    this.fire(['sortCriteriaChanged','dirtyOrder','dirtyHeader','dirtyValues','dirty'], bak, this.sortCriteria());
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
    this.forward(col, 'dirtyValues.ranking','dirtyHeader.ranking','dirty.ranking');


    this.fire(['addColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], col, index);

    if (this.sortBy_ === null) {
      this.sortBy(col);
    }
    return col;
  }

  insertAfter(col: Column, ref: Column) {
    if (ref === this ) {
      return this.insert(col, 0) != null;
    }
    var i = this.columns_.indexOf(ref);
    if (i < 0) {
      return false;
    }
    return this.insert(col, i+1) != null;
  }

  push(col:Column) {
    return this.insert(col);
  }

  remove(col:Column) {
    var i = this.columns_.indexOf(col);
    if (i < 0) {
      return false;
    }

    this.unforward(col, 'dirtyValues.ranking','dirtyHeader.ranking','dirty.ranking');

    col.parent = null;
    this.columns_.splice(i, 1);
    this.fire(['removeColumn','dirtyHeader','dirtyValues','dirty'], col);
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
}

/**
 * a map of all known column types *
 */
export function models() {
  return {
    number: NumberColumn,
    string: StringColumn,
    link: LinkColumn,
    stack: StackColumn,
    rank: RankColumn,
    categorical: CategoricalColumn,
    ordinal: CategoricalNumberColumn
  };
}
