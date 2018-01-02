/**
 * Created by sam on 04.11.2016.
 */

import {scaleOrdinal, schemeCategory10, schemeCategory20} from 'd3-scale';
import {toolbar} from './annotations';
import Column from './Column';
import {
  IBaseCategoricalDesc, ICategoricalColumn, ICategoricalDesc, ICategoricalFilter,
  isEqualFilter,
} from './ICategoricalColumn';
import {IDataRow} from './interfaces';
import {FIRST_IS_NAN, missingGroup} from './missing';
import StringColumn from './StringColumn';
import ValueColumn from './ValueColumn';


function colorPool() {
  // dark, bright, and repeat
  const colors = schemeCategory10.concat(schemeCategory20.filter((_d, i) => i % 2 === 1));
  let act = 0;
  return () => colors[(act++) % colors.length];
}

/**
 * column for categorical values
 */
@toolbar('stratify', 'filterCategorical')
export default class CategoricalColumn extends ValueColumn<string> implements ICategoricalColumn {
  /**
   * colors for each category
   * @type {Ordinal<string, string>}
   */
  private colors = scaleOrdinal(schemeCategory10);

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
  private currentFilter: ICategoricalFilter | null = null;

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
    if (!desc.categories) {
      return;
    }
    const nextColor = colorPool();
    const cats: string[] = [];
    const colors: string[] = [];
    const labels = new Map<string, string>();
    desc.categories.forEach((cat) => {
      if (typeof cat === 'string') {
        //just the category value
        cats.push(cat);
        colors.push(nextColor());
        return;
      }
      //the name or value of the category
      cats.push(cat.name || cat.value);
      //optional label mapping
      if (cat.label) {
        labels.set(cat.name, cat.label);
      }
      //optional color
      if (cat.color) {
        colors.push(cat.color);
      } else {
        colors.push(nextColor());
      }
    });
    this.catLabels = labels;
    this.colors.domain(cats).range(colors);
  }

  get categories() {
    return this.colors.domain();
  }

  get categoryColors() {
    return this.colors.range();
  }

  get categoryLabels() {
    //no mapping
    if (this.catLabels == null || this.catLabels.size === 0) {
      return this.categories;
    }
    //label or identity mapping
    return this.categories.map((c) => this.catLabels.has(c) ? this.catLabels.get(c)! : c);
  }

  getLabel(row: IDataRow) {
    //no mapping
    if (this.catLabels == null || this.catLabels.size === 0) {
      return StringColumn.prototype.getValue.call(this, row);
    }
    return this.getLabels(row).join(this.separator);
  }

  getFirstLabel(row: IDataRow) {
    const l = this.getLabels(row);
    return l.length > 0 ? l[0] : null;
  }

  getLabels(row: IDataRow) {
    const v = StringColumn.prototype.getValue.call(this, row);
    const r = v ? v.split(this.separator) : [];

    const mapToLabel = (values: string[]) => {
      if (this.catLabels == null || this.catLabels.size === 0) {
        return values;
      }
      return values.map((v) => this.catLabels.has(v) ? this.catLabels.get(v) : v);
    };
    return mapToLabel(r);
  }

  getValue(row: IDataRow) {
    const r = this.getValues(row);
    return r.length > 0 ? r[0] : null;
  }

  getValues(row: IDataRow): string[] {
    const v = StringColumn.prototype.getValue.call(this, row);
    return v ? v.split(this.separator) : [];
  }

  isMissing(row: IDataRow) {
    const v = this.getValues(row);
    return !v || v.length === 0;
  }

  getCategories(row: IDataRow) {
    return this.getValues(row);
  }

  getColor(row: IDataRow) {
    const cat = this.getValue(row);
    if (cat == null || cat === '') {
      return null;
    }
    return this.colors(cat);
  }

  getColors(row: IDataRow) {
    return this.getCategories(row).map(this.colors);
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
      r.labels = Array.from(this.catLabels.entries());
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
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
    if (Array.isArray(dump.labels)) {
      this.catLabels = new Map<string, string>();
      dump.labels.forEach((e: { key: string, value: string }) => this.catLabels.set(e.key, e.value));
    }
    this.separator = dump.separator || this.separator;
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  static filter(filter: ICategoricalFilter | null, category: string) {
    if (!filter) {
      return true;
    }
    if (category == null && filter.filterMissing) {
      return false;
    }
    const filterObj = filter.filter;
    if (Array.isArray(filterObj)) { //array mode
      return filterObj.indexOf(category) >= 0;
    }
    if (typeof filterObj === 'string' && filterObj.length > 0) { //search mode
      return category != null && category.toLowerCase().indexOf(filterObj.toLowerCase()) >= 0;
    }
    if (filterObj instanceof RegExp) { //regex match mode
      return category != null && filterObj.test(category);
    }
    return true;
  }

  filter(row: IDataRow): boolean {
    if (!this.isFiltered()) {
      return true;
    }
    const vs = this.getCategories(row);

    if (this.currentFilter!.filterMissing && vs.length === 0) {
      return false;
    }

    return vs.every((v) => CategoricalColumn.filter(this.currentFilter, v));
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter: ICategoricalFilter | null) {
    if (isEqualFilter(this.currentFilter, filter)) {
      return;
    }
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.currentFilter, this.currentFilter = filter);
  }

  compare(a: IDataRow, b: IDataRow) {
    const va = this.getValues(a);
    const vb = this.getValues(b);
    if (va.length === 0) {
      // missing
      return vb.length === 0 ? 0 : FIRST_IS_NAN;
    }
    if (vb.length === 0) {
      return FIRST_IS_NAN * -1;
    }
    //check all categories
    for (let i = 0; i < Math.min(va.length, vb.length); ++i) {
      const ci = va[i].localeCompare(vb[i]);
      if (ci !== 0) {
        return ci;
      }
    }
    //smaller length wins
    return va.length - vb.length;
  }

  group(row: IDataRow) {
    if (this.isMissing(row)) {
      return missingGroup;
    }
    const name = this.getValue(row);
    if (!name) {
      return super.group(row);
    }
    const color = this.getColor(row)!;
    return {name, color};
  }

  getGroupRenderer() {
    const current = super.getGroupRenderer();
    if (current === this.desc.type && this.isGroupedBy() >= 0) {
      // still the default and the stratification criteria
      return 'catdistributionbar';
    }
    return current;
  }
}
