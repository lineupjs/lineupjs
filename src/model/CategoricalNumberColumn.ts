/**
 * Created by sam on 04.11.2016.
 */

import {max as d3max, scale, min as d3min} from 'd3';
import Column from './Column';
import ValueColumn from './ValueColumn';
import CategoricalColumn, {ICategoricalColumn} from './CategoricalColumn';
import NumberColumn, {INumberColumn} from './NumberColumn';

/**
 * similar to a categorical column but the categories are mapped to numbers
 */
export default class CategoricalNumberColumn extends ValueColumn<number> implements INumberColumn, ICategoricalColumn {
  static EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;

  private colors = scale.category10();

  /**
   * category labels by default the category name itself
   * @type {Array}
   */
  private catLabels = new Map<string, string>();

  private scale = scale.ordinal().rangeRoundPoints([0, 1]);

  private currentFilter: string[] = null;
  /**
   * separator for multi handling
   * @type {string}
   */
  private separator = ';';
  private combiner = d3max;

  constructor(id: string, desc: any) {
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

  protected createEventList() {
    return super.createEventList().concat([CategoricalNumberColumn.EVENT_MAPPING_CHANGED]);
  }

  get categories() {
    return this.colors.domain().slice();
  }

  get categoryColors() {
    return this.colors.range().slice();
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

  getLabel(row: any) {
    return CategoricalColumn.prototype.getLabel.call(this, row);
  }

  getFirstLabel(row: any) {
    return CategoricalColumn.prototype.getFirstLabel.call(this, row);
  }

  getLabels(row: any) {
    return CategoricalColumn.prototype.getLabels.call(this, row);
  }

  getValue(row: any) {
    const r = this.getValues(row);
    return r.length > 0 ? this.combiner(r) : 0;
  }

  getValues(row: any) {
    const r = CategoricalColumn.prototype.getValues.call(this, row);
    return r.map(this.scale);
  }

  getCategories(row: any) {
    return CategoricalColumn.prototype.getValues.call(this, row);
  }

  getNumber(row: any) {
    return this.getValue(row);
  }

  getColor(row: any) {
    const vs = this.getValues(row);
    const cs = this.getColors(row);
    if (this.combiner === d3max) {
      //use the max color
      return cs.slice(1).reduce((prev, act, i) => vs[i + 1] > prev.v ? {c: act, v: vs[i + 1]} : prev, {
        c: cs[0],
        v: vs[0]
      }).c;
    } else if (this.combiner === d3min) {
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

  dump(toDescRef: (desc: any) => any): any {
    var r = CategoricalColumn.prototype.dump.call(this, toDescRef);
    r.scale = {
      domain: this.scale.domain(),
      range: this.scale.range(),
      separator: this.separator
    };
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column) {
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

  setMapping(range: number[]) {
    var bak = this.getScale();
    this.scale.range(range);
    this.fire([CategoricalNumberColumn.EVENT_MAPPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getScale());
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row: any): boolean {
    return CategoricalColumn.prototype.filter.call(this, row);
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter: string[]) {
    if (this.currentFilter === filter) {
      return;
    }
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.currentFilter, this.currentFilter = filter);
  }

  compare(a: any, b: any) {
    return NumberColumn.prototype.compare.call(this, a, b);
  }
}
