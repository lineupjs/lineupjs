/**
 * Created by sam on 04.11.2016.
 */

import {ascending, scale} from 'd3';
import Column, {IColumnDesc} from './Column';
import ValueColumn,{IValueColumnDesc} from './ValueColumn';
import StringColumn from './StringColumn';

export interface ICategoricalColumn {
  readonly categories: string[];
  readonly categoryLabels: string[];

  getCategories(row: any, index: number): string[];
}

export interface ICategory {
  name: string;

  /**
   * optional label of this category (the one to render)
   */
  label?: string;
  /**
   * associated value with this category
   */
  value?: any;
  /**
   * category color
   * @default next in d3 color 10 range
   */
  color?: string;
}

export interface IBaseCategoricalDesc {
  /**
   * separator to split  multi value
   * @defualt ;
   */
  separator?: string;

  categories: (string|ICategory)[];
}

export declare type ICategoricalDesc = IValueColumnDesc<string> & IBaseCategoricalDesc;

/**
 * checks whether the given column or description is a categorical column, i.e. the value is a list of categories
 * @param col
 * @returns {boolean}
 */
export function isCategoricalColumn(col: Column|IColumnDesc) {
  return (col instanceof Column && typeof (<any>col).getCategories === 'function' || (!(col instanceof Column) && (<IColumnDesc>col).type.match(/(categorical|ordinal)/) != null));
}

export interface ICategoricalFilter {
  filter: string[]|string|RegExp;
  filterMissing: boolean;
}

function isEqualFilter(a: ICategoricalFilter, b: ICategoricalFilter) {
  if (a === b) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  if (a.filterMissing !== b.filterMissing || (typeof a.filter !== typeof b.filter)) {
    return false;
  }
  if (Array.isArray(a.filter)) {
    return arrayEquals(<string[]>a.filter, <string[]>b.filter);
  }
  return String(a.filter) === String(b.filter);
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
  return a.every((ai, i) => ai === b[i]);
}

/**
 * column for categorical values
 */
export default class CategoricalColumn extends ValueColumn<string> implements ICategoricalColumn {
  /**
   * colors for each category
   * @type {Ordinal<string, string>}
   */
  private colors = scale.category10();

  /**
   * category labels by default the category name itself
   * @type {Array}
   */
  private catLabels = new Map<string, string>();

  /**
   * set of categories to show
   * @type {null}
   * @private
   */
  private currentFilter: ICategoricalFilter = null;

  /**
   * split multiple categories
   * @type {string}
   */
  private separator = ';';

  constructor(id: string, desc: ICategoricalDesc) {
    super(id, desc);
    this.separator = desc.separator || this.separator;
    this.initCategories(desc);
    //TODO infer categories from data
  }

  initCategories(desc: IBaseCategoricalDesc) {
    if (desc.categories) {
      const cats = [],
        cols = this.colors.range().slice(), //work on a copy since it will be manipulated
        labels = new Map<string, string>();
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
    if (this.catLabels === null || this.catLabels.size === 0) {
      return this.categories;
    }
    //label or identity mapping
    return this.categories.map((c) => this.catLabels.has(c) ? this.catLabels.get(c) : c);
  }

  colorOf(cat: string) {
    return this.colors(cat);
  }

  getLabel(row: any, index: number) {
    //no mapping
    if (this.catLabels === null || this.catLabels.size === 0) {
      return '' + StringColumn.prototype.getValue.call(this, row, index);
    }
    return this.getLabels(row, index).join(this.separator);
  }

  getFirstLabel(row: any, index: number) {
    const l = this.getLabels(row, index);
    return l.length > 0 ? l[0] : null;
  }


  getLabels(row: any, index: number) {
    const v = StringColumn.prototype.getValue.call(this, row, index);
    const r = v ? v.split(this.separator) : [];

    const mapToLabel = (values: string[]) => {
      if (this.catLabels === null || this.catLabels.size === 0) {
        return values;
      }
      return values.map((v) => this.catLabels.has(v) ? this.catLabels.get(v) : v);
    };
    return mapToLabel(r);
  }

  getValue(row: any, index: number) {
    const r = this.getValues(row, index);
    return r.length > 0 ? r[0] : null;
  }

  getValues(row: any, index: number) {
    const v = StringColumn.prototype.getValue.call(this, row, index);
    return v ? v.split(this.separator) : [];
  }

  getCategories(row: any, index: number) {
    return this.getValues(row, index);
  }

  getColor(row: any, index: number) {
    const cat = this.getValue(row, index);
    if (cat === null || cat === '') {
      return null;
    }
    return this.colors(cat);
  }

  getColors(row: any, index: number) {
    return this.getCategories(row, index).map(this.colors);
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.filter = this.currentFilter;
    r.colors = {
      domain: this.colors.domain(),
      range: this.colors.range(),
      separator: this.separator
    };
    if (this.catLabels !== null && this.catLabels.size !== 0) {
      r.labels = this.catLabels.entries();
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column) {
    super.restore(dump, factory);
    if ('filter' in dump) {
      const bak = dump.filter;
      if (typeof bak === 'string' || Array.isArray(bak)) {
        this.currentFilter = {filter: bak, filterMissing: false};
      } else {
        this.currentFilter = bak;
      }
    } else {
      this.currentFilter = null;
    }
    if (dump.colors) {
      this.colors.domain(dump.colors.domain).range(dump.colors.range);
    }
    if (dump.labels) {
      this.catLabels = new Map<string, string>();
      dump.labels.forEach((e) => this.catLabels.set(e.key, e.value));
    }
    this.separator = dump.separator || this.separator;
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row: any, index: number): boolean {
    if (!this.isFiltered()) {
      return true;
    }
    const vs = this.getCategories(row, index),
      filter = this.currentFilter.filter;

    if (this.currentFilter.filterMissing && vs.length === 0) {
      return false;
    }

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

  setFilter(filter: ICategoricalFilter) {
    if (isEqualFilter(this.currentFilter, filter)) {
      return;
    }
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.currentFilter, this.currentFilter = filter);
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    const va = this.getValues(a, aIndex);
    const vb = this.getValues(b, bIndex);
    //check all categories
    for (let i = 0; i < Math.min(va.length, vb.length); ++i) {
      const ci = ascending(va[i], vb[i]);
      if (ci !== 0) {
        return ci;
      }
    }
    //smaller length wins
    return va.length - vb.length;
  }
}
