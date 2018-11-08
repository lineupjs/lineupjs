import {Category, toolbar} from './annotations';
import CategoricalColumn from './CategoricalColumn';
import Column, {labelChanged, metaDataChanged, dirty, widthChanged, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import {IArrayColumn} from './IArrayColumn';
import {ICategoricalDesc, ICategoricalFilter, ICategory, isCategoryIncluded, toCategories} from './ICategoricalColumn';
import {IDataRow} from './interfaces';
import {FIRST_IS_MISSING} from './missing';
import ValueColumn, {IValueColumnDesc, dataLoaded} from './ValueColumn';
import {IEventListener} from '../internal/AEventDispatcher';

export interface ISetDesc extends ICategoricalDesc {
  separator?: string;
}

export declare type ISetColumnDesc = ISetDesc & IValueColumnDesc<string[]>;

/**
 * emitted when the filter property changes
 * @asMemberOf SetColumn
 * @event
 */
export declare function filterChanged(previous: ICategoricalFilter | null, current: ICategoricalFilter | null): void;

/**
 * a string column with optional alignment
 */
@toolbar('filterCategorical')
@Category('categorical')
export default class SetColumn extends ValueColumn<string[]> implements IArrayColumn<boolean> {
  static readonly EVENT_FILTER_CHANGED = CategoricalColumn.EVENT_FILTER_CHANGED;

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

  protected createEventList() {
    return super.createEventList().concat([SetColumn.EVENT_FILTER_CHANGED]);
  }

  on(type: typeof SetColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
  on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
  on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(<any>type, listener);
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
