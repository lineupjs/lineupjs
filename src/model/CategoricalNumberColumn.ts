/**
 * Created by sam on 04.11.2016.
 */

import {max as d3max, min as d3min, scale} from 'd3';
import Column from './Column';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import CategoricalColumn from './CategoricalColumn';
import {ICategoricalColumn, IBaseCategoricalDesc, ICategoricalFilter} from './ICategoricalColumn';
import NumberColumn, {INumberColumn} from './NumberColumn';
import {IGroupData} from '../ui/engine/interfaces';

export declare type ICategoricalNumberColumnDesc = IBaseCategoricalDesc & IValueColumnDesc<number>;

/**
 * similar to a categorical column but the categories are mapped to numbers
 */
export default class CategoricalNumberColumn extends ValueColumn<number> implements INumberColumn, ICategoricalColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;

  private colors = scale.category10();

  /**
   * category labels by default the category name itself
   * @type {Array}
   */
  private catLabels = new Map<string, string>();

  private readonly scale = scale.ordinal().rangeRoundPoints([0, 1]);

  private currentFilter: ICategoricalFilter | null = null;
  /**
   * separator for multi handling
   * @type {string}
   */
  private separator = ';';
  private combiner = d3max;

  constructor(id: string, desc: ICategoricalNumberColumnDesc) {
    super(id, desc);
    this.separator = desc.separator || this.separator;
    CategoricalColumn.prototype.initCategories.call(this, desc);

    this.scale.domain(this.colors.domain());
    if (desc.categories) {
      //lookup value or 0.5 by default
      const values = desc.categories.map((d) => ((typeof d !== 'string' && typeof (d.value) === 'number')) ? d.value : 0.5);
      this.scale.range(values);
    }
    this.setDefaultRenderer('number');
    this.setDefaultGroupRenderer('boxplot');
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
    return this.categories.map((c) => this.catLabels.has(c) ? this.catLabels.get(c)! : c);
  }

  colorOf(cat: string) {
    return this.colors(cat);
  }

  getLabel(row: any, index: number) {
    return CategoricalColumn.prototype.getLabel.call(this, row, index);
  }

  getFirstLabel(row: any, index: number) {
    return CategoricalColumn.prototype.getFirstLabel.call(this, row, index);
  }

  getLabels(row: any, index: number) {
    return CategoricalColumn.prototype.getLabels.call(this, row, index);
  }

  getValue(row: any, index: number) {
    const r = this.getValues(row, index);
    return r.length > 0 ? this.combiner(r) : 0;
  }

  getValues(row: any, index: number) {
    const r = CategoricalColumn.prototype.getValues.call(this, row, index);
    return r.map(this.scale);
  }

  getCategories(row: any, index: number) {
    return CategoricalColumn.prototype.getValues.call(this, row, index);
  }

  getNumber(row: any, index: number) {
    return this.getValue(row, index);
  }

  isMissing(row: any, index: number) {
    return this.getLabels(row, index).length === 0;
  }

  getRawNumber(row: any, index: number) {
    return this.getNumber(row, index);
  }

  getColor(row: any, index: number): string | null {
    const vs = this.getValues(row, index);
    const cs = this.getColors(row, index);
    if (this.combiner === d3max) {
      //use the max color
      return cs.slice(1).reduce((prev, act, i) => vs[i + 1] > prev.v ? {c: act, v: vs[i + 1]} : prev, {
        c: cs[0],
        v: vs[0]
      }).c;
    }
    if (this.combiner === d3min) {
      //use the max color
      return cs.slice(1).reduce((prev, act, i) => vs[i + 1] < prev.v ? {c: act, v: vs[i + 1]} : prev, {
        c: cs[0],
        v: vs[0]
      }).c;
    }
    //use the first
    return cs[0] || null;
  }

  getColors(row: any, index: number): string[] {
    return CategoricalColumn.prototype.getColors.call(this, row, index);
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = CategoricalColumn.prototype.dump.call(this, toDescRef);
    r.scale = {
      domain: this.scale.domain(),
      range: this.scale.range(),
      separator: this.separator
    };
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
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
    const bak = this.getScale();
    this.scale.range(range);
    this.fire([CategoricalNumberColumn.EVENT_MAPPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getScale());
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row: any, index: number): boolean {
    return CategoricalColumn.prototype.filter.call(this, row, index);
  }

  group(row: any, index: number) {
    return CategoricalColumn.prototype.group.call(this, row, index);
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter: ICategoricalFilter | null) {
    return CategoricalColumn.prototype.setFilter.call(this, filter);
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    return NumberColumn.prototype.compare.call(this, a, b, aIndex, bIndex);
  }

  groupCompare(a: IGroupData, b: IGroupData) {
    return NumberColumn.prototype.groupCompare.call(this, a, b);
  }

  getRendererType(): string {
    return NumberColumn.prototype.getRendererType.call(this);
  }
}
