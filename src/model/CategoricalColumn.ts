import {Category, toolbar} from './annotations';
import Column from './Column';
import {
  compareCategory,
  ICategoricalColumn, ICategoricalColumnDesc, ICategoricalFilter, ICategory,
  isEqualCategoricalFilter, isCategoryIncluded, toCategories, toCategory,
} from './ICategoricalColumn';
import {IDataRow, IGroup} from './interfaces';
import {missingGroup} from './missing';
import ValueColumn from './ValueColumn';


/**
 * column for categorical values
 */
@toolbar('stratify', 'filterCategorical')
@Category('categorical')
export default class CategoricalColumn extends ValueColumn<string> implements ICategoricalColumn {

  readonly categories: ICategory[];

  private readonly missingCategory: ICategory | null;

  private readonly lookup = new Map<string, Readonly<ICategory>>();
  /**
   * set of categories to show
   * @type {null}
   * @private
   */
  private currentFilter: ICategoricalFilter | null = null;

  constructor(id: string, desc: Readonly<ICategoricalColumnDesc>) {
    super(id, desc);
    this.categories = toCategories(desc);
    this.missingCategory = desc.missingCategory ? toCategory(desc.missingCategory, NaN) : null;
    this.categories.forEach((d) => this.lookup.set(d.name, d));
  }

  getValue(row: IDataRow) {
    const v = this.getCategory(row);
    return v ? v.name : null;
  }

  getCategory(row: IDataRow) {
    const v = super.getValue(row);
    if (!v) {
      return this.missingCategory;
    }
    const vs = String(v);
    return this.lookup.has(vs) ? this.lookup.get(vs)! : this.missingCategory;
  }

  get dataLength() {
    return this.categories.length;
  }

  get labels() {
    return this.categories.map((d) => d.label);
  }

  getLabel(row: IDataRow) {
    const v = this.getCategory(row);
    return v ? v.label : '';
  }

  getValues(row: IDataRow) {
    const v = this.getCategory(row);
    return this.categories.map((d) => d === v);
  }

  getLabels(row: IDataRow) {
    return this.getValues(row).map(String);
  }

  getMap(row: IDataRow) {
    const cats = this.categories;
    return this.getValues(row).map((value, i) => ({key: cats[i].label, value}));
  }

  getMapLabel(row: IDataRow) {
    const cats = this.categories;
    return this.getLabels(row).map((value, i) => ({key: cats[i].label, value}));
  }

  getSet(row: IDataRow) {
    const cat = this.getCategory(row);
    const r = new Set<ICategory>();
    if (cat && cat !== this.missingCategory) {
      r.add(cat);
    }
    return r;
  }

  isMissing(row: IDataRow) {
    return this.getCategory(row) === this.missingCategory;
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
    return isCategoryIncluded(this.currentFilter, this.getCategory(row));
  }

  getFilter() {
    return this.currentFilter == null ? null : Object.assign({}, this.currentFilter);
  }

  setFilter(filter: ICategoricalFilter | null) {
    if (isEqualCategoricalFilter(this.currentFilter, filter)) {
      return;
    }
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.currentFilter, this.currentFilter = filter);
  }

  compare(a: IDataRow, b: IDataRow) {
    return compareCategory(this.getCategory(a), this.getCategory(b));
  }

  group(row: IDataRow): IGroup {
    const cat = this.getCategory(row);
    if (!cat) {
      return missingGroup;
    }
    return {name: cat.label, color: cat.color};
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
