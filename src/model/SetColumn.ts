import {Category, toolbar} from './annotations';
import CategoricalColumn from './CategoricalColumn';
import Column from './Column';
import {IArrayColumn} from './IArrayColumn';
import {ICategoricalDesc, ICategoricalFilter, ICategory, isCategoryIncluded, toCategories} from './ICategoricalColumn';
import {IDataRow} from './interfaces';
import {FIRST_IS_MISSING} from './missing';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';

export interface ISetDesc extends ICategoricalDesc {
  separator?: string;
}

export declare type ISetColumnDesc = ISetDesc & IValueColumnDesc<string[]>;

/**
 * a string column with optional alignment
 */
@toolbar('filterCategorical')
@Category('categorical')
export default class SetColumn extends ValueColumn<string[]> implements IArrayColumn<boolean> {
  readonly categories: ICategory[];

  private readonly separator: RegExp;

  private readonly lookup = new Map<string, Readonly<ICategory>>();
  /**
   * set of categories to show
   * @type {null}
   * @private
   */
  private currentFilter: ICategoricalFilter | null = null;

  constructor(id: string, desc: Readonly<ISetColumnDesc>) {
    super(id, desc);
    this.separator = new RegExp(desc.separator || ';');
    this.categories = toCategories(desc);
    this.categories.forEach((d) => this.lookup.set(d.name, d));
    this.setDefaultRenderer('upset');
    this.setDefaultGroupRenderer('upset');
  }

  get labels() {
    return this.categories.map((d) => d.label);
  }

  get dataLength() {
    return this.categories.length;
  }

  getValue(row: IDataRow): string[] {
    return this.getCategories(row).map((d) => d.name);
  }

  getLabel(row: IDataRow) {
    return `(${this.getCategories(row).map((d) => d.label).join(',')})`;
  }

  private normalize(v: any) {
    if (typeof v === 'string') {
      return v.split(this.separator).map((s) => s.trim());
    }
    if (Array.isArray(v)) {
      return v.map((v) => String(v).trim());
    }
    if (v instanceof Set) {
      return Array.from(v).map(String);
    }
    return [];
  }

  getSet(row: IDataRow) {
    const sv = this.normalize(super.getValue(row));
    const r = new Set<ICategory>();
    sv.forEach((n) => {
      const cat = this.lookup.get(n);
      if (cat) {
        r.add(cat);
      }
    });
    return r;
  }

  getCategories(row: IDataRow) {
    return Array.from(this.getSet(row)).sort((a, b) => a.value === b.value ? a.label.localeCompare(b.label) : a.value - b.value);
  }

  isMissing(row: IDataRow) {
    const s = this.getSet(row);
    return s.size === 0;
  }

  getValues(row: IDataRow) {
    const s = new Set(this.getSet(row));
    return this.categories.map((d) => s.has(d));
  }

  getLabels(row: IDataRow) {
    return this.getValues(row).map(String);
  }

  getMap(row: IDataRow) {
    return this.getCategories(row).map((d) => ({key: d.label, value: true}));
  }

  getMapLabel(row: IDataRow) {
    return this.getCategories(row).map((d) => ({key: d.label, value: 'true'}));
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.filter = this.currentFilter;
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (!('filter' in dump)) {
      this.currentFilter = null;
      return;
    }
    const bak = dump.filter;
    if (typeof bak === 'string' || Array.isArray(bak)) {
      this.currentFilter = {filter: bak, filterMissing: false};
    } else {
      this.currentFilter = bak;
    }
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row: IDataRow): boolean {
    if (!this.currentFilter) {
      return true;
    }
    return Array.from(this.getSet(row)).some((s) => isCategoryIncluded(this.currentFilter, s));
  }

  getFilter() {
    return CategoricalColumn.prototype.getFilter.call(this);
  }

  setFilter(filter: ICategoricalFilter | null) {
    return CategoricalColumn.prototype.setFilter.call(this, filter);
  }

  compare(a: IDataRow, b: IDataRow) {
    const av = this.getSet(a);
    const bv = this.getSet(b);
    if (av.size === 0) {
      return bv.size === 0 ? 0 : FIRST_IS_MISSING;
    }
    if (bv.size === 0) {
      return -FIRST_IS_MISSING;
    }
    if (av.size !== bv.size) {
      return av.size - bv.size;
    }
    // first one having a category wins
    for (const cat of this.categories) {
      if (av.has(cat)) {
        return -1;
      }
      if (bv.has(cat)) {
        return +1;
      }
    }
    return 0;
  }
}
