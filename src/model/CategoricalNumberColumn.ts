/**
 * Created by sam on 04.11.2016.
 */

import {scaleOrdinal, schemeCategory10} from 'd3-scale';
import CategoricalColumn from './CategoricalColumn';
import Column from './Column';
import {IBaseCategoricalDesc, ICategoricalColumn, ICategoricalFilter} from './ICategoricalColumn';
import {IDataRow, IGroupData} from './interfaces';
import NumberColumn, {INumberColumn} from './NumberColumn';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';

export declare type ICategoricalNumberColumnDesc = IBaseCategoricalDesc & IValueColumnDesc<number>;

function max(v: number[]) {
  return Math.max(...v);
}

function min(v: number[]) {
  return Math.min(...v);
}

/**
 * similar to a categorical column but the categories are mapped to numbers
 */
export default class CategoricalNumberColumn extends ValueColumn<number> implements INumberColumn, ICategoricalColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;

  private colors = scaleOrdinal<string, string>(schemeCategory10);

  /**
   * category labels by default the category name itself
   * @type {Array}
   */
  private catLabels = new Map<string, string>();

  private readonly scale = scaleOrdinal<string, number>();

  private currentFilter: ICategoricalFilter | null = null;
  /**
   * separator for multi handling
   * @type {string}
   */
  private separator = ';';
  private combiner = max;

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

  get categories(): string[] {
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

  getLabel(row: IDataRow) {
    return CategoricalColumn.prototype.getLabel.call(this, row);
  }

  getFirstLabel(row: IDataRow) {
    return CategoricalColumn.prototype.getFirstLabel.call(this, row);
  }

  getLabels(row: IDataRow) {
    return CategoricalColumn.prototype.getLabels.call(this, row);
  }

  getValue(row: IDataRow) {
    const r = this.getValues(row);
    return r.length > 0 ? this.combiner(r) : 0;
  }

  getValues(row: IDataRow) {
    const r = CategoricalColumn.prototype.getValues.call(this, row);
    return r.map(this.scale);
  }

  getCategories(row: IDataRow) {
    return CategoricalColumn.prototype.getValues.call(this, row);
  }

  getNumber(row: IDataRow) {
    return this.getValue(row);
  }

  isMissing(row: IDataRow) {
    return this.getLabels(row).length === 0;
  }

  getRawNumber(row: IDataRow) {
    return this.getNumber(row);
  }

  getColor(row: IDataRow): string | null {
    const vs = this.getValues(row);
    const cs = this.getColors(row);
    if (this.combiner === max) {
      //use the max color
      return cs.slice(1).reduce((prev, act, i) => vs[i + 1] > prev.v ? {c: act, v: vs[i + 1]} : prev, {
        c: cs[0],
        v: vs[0]
      }).c;
    }
    if (this.combiner === min) {
      //use the max color
      return cs.slice(1).reduce((prev, act, i) => vs[i + 1] < prev.v ? {c: act, v: vs[i + 1]} : prev, {
        c: cs[0],
        v: vs[0]
      }).c;
    }
    //use the first
    return cs[0] || null;
  }

  getColors(row: IDataRow): string[] {
    return CategoricalColumn.prototype.getColors.call(this, row);
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

  filter(row: IDataRow): boolean {
    return CategoricalColumn.prototype.filter.call(this, row);
  }

  group(row: IDataRow) {
    return CategoricalColumn.prototype.group.call(this, row);
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter: ICategoricalFilter | null) {
    return CategoricalColumn.prototype.setFilter.call(this, filter);
  }

  compare(a: IDataRow, b: IDataRow) {
    return NumberColumn.prototype.compare.call(this, a, b);
  }

  groupCompare(a: IGroupData, b: IGroupData) {
    return NumberColumn.prototype.groupCompare.call(this, a, b);
  }

  getRenderer(): string {
    return NumberColumn.prototype.getRenderer.call(this);
  }
}
