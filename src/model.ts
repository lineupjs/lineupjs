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
    return super.createEventList().concat(['widthChanged', 'dirtySorting', 'dirtyFilter', 'dirtyValues', 'addColumn', 'removeColumn', 'dirty', 'dirtyHeader']);
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
      return
    }
    this.fire('widthChanged', this, this.width_, this.width_ = value);
    this.fire('dirty', this);
  }

  setLabel(value: string) {
    if (value === this.label) {
      return;
    }
    this.fire('dirtyHeader', this, this.label, this.label = value);
    this.fire('dirty', this);
  }

  get color() {
    return this.desc.color || 'gray';
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
    return {
      id: this.id,
      desc: toDescRef(this.desc),
      width: this.width_
    };
  }

  restore(dump: any, factory : (dump: any) => Column) {
    this.width_ = dump.width;
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

export class NumberColumn extends ValueColumn<number> {
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
    this.scale.domain(dump.domain);
    this.scale.range(dump.range);
    this.mapping.domain(dump.mapping.scale).range(dump.mapping.range);
    this.filter_ = dump.filter;
    this.missingValue = dump.missingValue;
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

  compare(a:any[], b:any[]) {
    return numberCompare(this.getValue(a), this.getValue(b));
  }

  getMapping() {
    return {
      domain: <[number, number]>this.mapping.domain(),
      range: <[number, number]>this.mapping.range()
    }
  }

  getOriginalMapping() {
    return {
      domain: <[number, number]>this.mapping.domain(),
      range: <[number, number]>this.mapping.range()
    }
  }

  setMapping(domain: [number, number], range: [number, number]) {
    var bak = this.getMapping();
    this.mapping.domain(domain).range(range);
    this.fire('dirtyValues', this, bak, this.getMapping());
    this.fire('dirty', this);
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
    this.fire('dirtyFilter', this, bak, this.filter_);
    this.fire('dirty', this);
  }

  set filterMax(max:number) {
    var bak = {min: this.filter_.min, max: this.filter_.max};
    this.filter_.max = isNaN(max) ? Infinity : max;
    this.fire('dirtyFilter', this, bak, this.filter_);
    this.fire('dirty', this);
  }

  setFilter(min:number = -Infinity, max:number = +Infinity) {
    var bak = {min: this.filter_.min, max: this.filter_.max};
    this.filter_.min = isNaN(min) ? -Infinity : min;
    this.filter_.max = isNaN(max) ? Infinity : max;
    this.fire('dirtyFilter', this, bak, this.filter_);
    this.fire('dirty', this);
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
    this.fire('dirtyFilter', this, this.filter_, this.filter_ = filter);
    this.fire('dirty', this);
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
      return this.link.replace(/$1/g , v);
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
    this.colors.domain(dump.colors.domain).range(dump.colors.range);
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
    this.fire('dirtyFilter', this, this.filter_, this.filter_ = filter);
    this.fire('dirty', this);
  }

  compare(a:any[], b:any[]) {
    return StringColumn.prototype.compare.call(this, a, b);
  }
}

export class CategoricalNumberColumn extends ValueColumn<number> {
  private missingValue = NaN;
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

  get categories() {
    return this.colors.domain();
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
    this.scale.domain(dump.scale.domain).range(dump.scale.range);
  }

  getScale() {
    return {
      domain: this.scale.domain(),
      range: this.scale.range()
    }
  }

  setRange(range: number[]) {
    var bak = this.getScale();
    this.scale.range(range);
    this.fire('dirtyValues', this, bak, this.getScale());
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
    this.fire('dirtyFilter', this, this.filter_, this.filter_ = filter);
    this.fire('dirty', this);
  }

  compare(a:any[], b:any[]) {
    return NumberColumn.prototype.compare.call(this, a, b);
  }
}

/**
 * implementation of the stacked colum
 */
export class StackColumn extends Column implements IColumnParent {
  static desc(label: string) {
    return { type: 'stack', label : label };
  }

  public missingValue = NaN;
  private children_:Column[] = [];

  private triggerResort = () => this.fire('dirtySorting', this);
  private forwards = {
    dirtyFilter: utils.forwardEvent(this, 'dirtyFilter'),
    dirtyValues: utils.forwardEvent(this, 'dirtyValues'),
    addColumn: utils.forwardEvent(this, 'addColumn'),
    removeColumn: utils.forwardEvent(this, 'removeColumn'),
    dirty: utils.forwardEvent(this, 'dirty')
  };
  private adaptChange = this.adaptWidthChange.bind(this);

  private _collapsed = false;

  constructor(id:string, desc:any) {
    super(id, desc);
  }

  createEventList() {
    return super.createEventList().concat(['pushChild','removeChild', 'changeCollapse']);
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
    this.fire('changeCollapse', this, this._collapsed, this._collapsed = value);
  }

  get collapsed() {
    return this._collapsed;
  }

  flatten(r: IFlatColumn[], offset: number, levelsToGo = 0, padding = 0) {
    if (levelsToGo === 0) {
      var w = this.getWidth();
      if (!this.collapsed) {
        w += (this.children_.length-1)*padding;
      }
      r.push({col: this, offset: offset, width: w});
      return w;
    } else {
      var acc = offset;
      this.children_.forEach((c) => {
        acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
      });
      return acc - offset - padding;
    }
  }

  dump(toDescRef: (desc: any) => any) {
    var r = super.dump(toDescRef);
    r.children = this.children_.map((d) => d.dump(toDescRef));
    r.missingValue = this.missingValue;
    return r;
  }

  restore(dump: any, factory : (dump: any) => Column) {
    this.missingValue = dump.missingValue;
    dump.children.map((child) => {
      this.push(factory(child));
    });
    super.restore(dump, factory);
  }

  insert(col: Column, index: number, weight = NaN) {
    if (col instanceof StackColumn) {
      col.collapsed = true;
    }
    if (!isNaN(weight)) {
      col.setWidth((weight/(1-weight)*this.getWidth()));
    }

    this.children_.splice(index, 0, col);
    //listen and propagate events
    col.parent = this;
    col.on('dirtyFilter.stack', this.forwards.dirtyFilter);
    col.on('dirtyValues.stack', this.forwards.dirtyValues);
    col.on('addColumn.stack', this.forwards.addColumn);
    col.on('removeColumn.stack', this.forwards.removeColumn);
    col.on('dirtySorting.stack', this.triggerResort);
    col.on('widthChanged.stack', this.adaptChange);
    col.on('dirty.stack', this.forwards.dirty);

    //increase my width
    super.setWidth(this.getWidth() + col.getWidth());
    this.fire('pushChild', this, col, col.getWidth() / this.getWidth());
    this.fire('addColumn', this, col);
    this.fire('dirtySorting', this);
    this.fire('dirty', this);
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
        c.on('widthChanged.stack', null);
        c.setWidth(c.getWidth()*factor);
        c.on('widthChanged.stack', this.adaptChange);
      }
    });
    this.fire('dirtyValues', this);
    this.fire('dirtySorting', this);
    this.fire('widthChanged', this, full, full);
    this.fire('dirty', this);
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
      c.on('widthChanged.stack', null);
      c.setWidth(weights[i]);
      c.on('widthChanged.stack', this.adaptChange);
    });
    this.fire('dirtyValues', this);
    this.fire('dirtySorting', this);
    this.fire('widthChanged', this, this.getWidth(), this.getWidth());
    this.fire('dirty', this);

  }

  remove(child:Column) {
    var i = this.children_.indexOf(child);
    if (i < 0) {
      return false;
    }
    var c = this.children_[i];
    this.children_.splice(i, 1); //remove and deregister listeners
    child.parent = null;
    child.on('dirtyFilter.stack', null);
    child.on('dirtyValues.stack', null);
    child.on('addColumn.stack', null);
    child.on('removeColumn.stack', null);
    child.on('dirtySorting.stack', null);
    child.on('widthChanged.stack', null);
    child.on('dirty.stack', null);
    //reduce width to keep the percentages
    super.setWidth(this.getWidth() - child.getWidth());
    this.fire('removeChild', this, child);
    this.fire('removeColumn', this, child);
    this.fire('dirtySorting', this);
    this.fire('dirty', this);
    return true;
  }

  setWidth(value:number) {
    var factor = value / this.getWidth();
    this.children_.forEach((child) => {
      //disable since we change it
      child.on('widthChanged.stack', null);
      child.setWidth(child.getWidth() * factor);
      child.on('widthChanged.stack', this.adaptChange);
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

  compare(a:any[], b:any[]) {
    return numberCompare(this.getValue(a), this.getValue(b));
  }

  isFiltered() {
    return this.children_.some((d) => d.isFiltered());
  }

  filter(row: any) {
    return this.children_.every((d) => d.filter(row));
  }
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

  /**
   * public extra data for layouts
   * @type {{}}
   */
  extra:any = {};

  private triggerResort = () => this.fire('dirtySorting', this);
  private forwards = {
    dirtyFilter: utils.forwardEvent(this, 'dirtyFilter'),
    dirtyValues: utils.forwardEvent(this, 'dirtyValues'),
    widthChanged: utils.forwardEvent(this, 'widthChanged'),
    addColumn: utils.forwardEvent(this, 'addColumn'),
    removeColumn: utils.forwardEvent(this, 'removeColumn'),
    dirty: utils.forwardEvent(this, 'dirty')
  };

  comparator = (a:any[], b:any[]) => {
    if (this.sortBy_ === null) {
      return 0;
    }
    var r = this.sortBy_.compare(a, b);
    return this.ascending ? r : -r;
  };

  constructor(id:string, desc:any) {
    super(id, desc);
  }

  createEventList() {
    return super.createEventList().concat(['sortCriteriaChanged', 'pushChild', 'removeChild']);
  }

  dump(toDescRef:(desc:any) => any) {
    var r = super.dump(toDescRef);
    r.columns = this.columns_.map((d) => d.dump(toDescRef));
    r.sortCriteria = this.sortCriteria();
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
    this.ascending = dump.sortCriteria.asc;
    if (dump.sortCriteria.sortBy) {
      this.sortBy(this.columns_.filter((d) => d.id === dump.sortCriteria.sortBy)[0], dump.sortCriteria.asc);
    }
  }

  flatten(r:IFlatColumn[], offset:number, levelsToGo = 0, padding = 0) {
    r.push({col: this, offset: offset, width: this.getWidth()});
    var acc = offset + this.getWidth() + padding;
    if (levelsToGo > 0) {
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
    if (col.on('dirtyFilter.ranking') !== this.forwards.dirtyFilter) {
      return false; //not one of mine
    }
    if (this.sortBy_ === col && this.ascending === ascending) {
      return true; //already in this order
    }
    if (this.sortBy_) { //disable dirty listenening
      this.sortBy_.on('dirtySorting.ranking', null);
    }
    var bak = this.sortCriteria();
    this.sortBy_ = col;
    if (this.sortBy_) { //enable dirty listenering
      this.sortBy_.on('dirtySorting.ranking', this.triggerResort);
    }
    this.ascending = ascending;
    this.fire('sortCriteriaChanged', this, bak, this.sortCriteria());
    this.fire('dirty', this);
    this.triggerResort();
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
    col.on('dirtyFilter.ranking', this.forwards.dirtyFilter);
    col.on('dirtyValues.ranking', this.forwards.dirtyValues);
    col.on('addColumn.ranking', this.forwards.addColumn);
    col.on('removeColumn.ranking', this.forwards.removeColumn);
    col.on('widthChanged.ranking', this.forwards.widthChanged);
    col.on('dirty.ranking', this.forwards.dirty);

    if (this.sortBy_ === null) {
      //use the first columns as sorting criteria
      this.sortBy_ = col;
      this.sortBy_.on('dirtySorting.ranking', this.triggerResort);
      this.triggerResort();
    }

    this.fire('pushChild', this, col, index);
    this.fire('dirty', this);

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
    return this.columns_.some((c, i, arr) => {
      if (c === col) {
        col.on('dirtyFilter.ranking', null);
        col.on('dirtyValues.ranking', null);
        col.on('widthChanged.ranking', null);
        col.on('addColumn.ranking', null);
        col.on('removeColumn.ranking', null);
        col.on('dirty.ranking', null);
        col.parent = null;
        arr.splice(i, 1);
        if (this.sortBy_ === c) { //was my sorting one
          this.sortBy(arr.length > 0 ? arr[0] : null);
        }
        this.fire('removeChild', this, col);
        this.fire('dirty', this);
        return true;
      }
      return false;
    });
  }

  find(id_or_filter:(col:Column) => boolean | string) {
    var filter = typeof(id_or_filter) === 'string' ? (col) => col.id === id_or_filter : id_or_filter;
    var r:IFlatColumn[] = [];
    this.flatten(r, 0, Number.POSITIVE_INFINITY);
    for (var i = 0; i < r.length; ++i) {
      if (filter(r[i].col)) {
        return r[i].col;
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
          }
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
    }
  }

  isFiltered() {
    return this.columns_.some((d) => d.isFiltered());
  }

  filter(row:any) {
    return this.columns_.every((d) => d.filter(row));
  }
}

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
