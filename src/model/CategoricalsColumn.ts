import ArrayColumn, { type IArrayColumnDesc } from './ArrayColumn';
import type {
  ICategoricalDesc,
  ICategory,
  ICategoricalColorMappingFunction,
  ISetCategoricalFilter,
  ICategoricalsColumn,
} from './ICategoricalColumn';
import { type IDataRow, ECompareValueType, type ITypeFactory } from './interfaces';
import { toolbar } from './annotations';
import CategoricalColumn from './CategoricalColumn';
import { DEFAULT_CATEGORICAL_COLOR_FUNCTION } from './CategoricalColorMappingFunction';
import type { dataLoaded } from './ValueColumn';
import type ValueColumn from './ValueColumn';
import Column, {
  DEFAULT_COLOR,
  labelChanged,
  metaDataChanged,
  dirty,
  dirtyHeader,
  dirtyValues,
  rendererTypeChanged,
  groupRendererChanged,
  summaryRendererChanged,
  visibilityChanged,
  widthChanged,
  dirtyCaches,
} from './Column';
import type { IEventListener, ISequence } from '../internal';
import { isCategoryIncluded, isEqualSetCategoricalFilter, toCategories } from './internalCategorical';
import { chooseUIntByDataLength, integrateDefaults } from './internal';

export declare type ICategoricalsColumnDesc = ICategoricalDesc & IArrayColumnDesc<string | null>;

/**
 * emitted when the color mapping property changes
 * @asMemberOf CategoricalsColumn
 * @event
 */
export declare function colorMappingChanged_CCS(
  previous: ICategoricalColorMappingFunction,
  current: ICategoricalColorMappingFunction
): void;

/**
 * emitted when the filter property changes
 * @asMemberOf CategoricalsColumn
 * @event
 */
export declare function filterChanged_CCS(
  previous: ISetCategoricalFilter | null,
  current: ISetCategoricalFilter | null
): void;

/**
 * a string column with optional alignment
 */
@toolbar('rename', 'sort', 'sortBy', 'filterCategorical', 'colorMappedCategorical')
export default class CategoricalsColumn extends ArrayColumn<string | null> implements ICategoricalsColumn {
  static readonly EVENT_COLOR_MAPPING_CHANGED = CategoricalColumn.EVENT_COLOR_MAPPING_CHANGED;
  static readonly EVENT_FILTER_CHANGED = CategoricalColumn.EVENT_FILTER_CHANGED;

  readonly categories: ICategory[];

  private readonly lookup = new Map<string, Readonly<ICategory>>();

  private colorMapping: ICategoricalColorMappingFunction;

  private currentFilter: ISetCategoricalFilter | null = null;

  constructor(id: string, desc: Readonly<ICategoricalsColumnDesc>) {
    super(
      id,
      integrateDefaults(desc, {
        renderer: 'categoricalshistogram',
        groupRenderer: 'categorical',
        summaryRenderer: 'categorical',
      })
    );
    this.categories = toCategories(desc);
    this.categories.forEach((d) => this.lookup.set(d.name, d));
    this.colorMapping = DEFAULT_CATEGORICAL_COLOR_FUNCTION;
  }

  onDataUpdate(rows: ISequence<IDataRow>): void {
    super.onDataUpdate(rows);
    if ((this.desc as ICategoricalsColumnDesc).categories) {
      return;
    }
    // derive
    const categories = new Set<string>();
    rows.forEach((row) => {
      const value = super.getValue(row);
      if (!value || !Array.isArray(value) || value.length === 0) {
        return;
      }
      for (const kv of value) {
        if (!kv) {
          continue;
        }
        categories.add(String(kv));
      }
    });
    this.categories.splice(0, this.categories.length, ...toCategories({ categories: Array.from(categories) }));
    this.categories.forEach((d) => this.lookup.set(d.name, d));
  }

  protected createEventList() {
    return super
      .createEventList()
      .concat([CategoricalsColumn.EVENT_FILTER_CHANGED, CategoricalsColumn.EVENT_COLOR_MAPPING_CHANGED]);
  }

  on(
    type: typeof CategoricalsColumn.EVENT_COLOR_MAPPING_CHANGED,
    listener: typeof colorMappingChanged_CCS | null
  ): this;
  on(type: typeof CategoricalsColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged_CCS | null): this;
  on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
  on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Column.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type as any, listener);
  }

  getCategories(row: IDataRow) {
    return super.getValues(row).map((v) => {
      if (!v) {
        return null;
      }
      const vs = String(v);
      return this.lookup.has(vs) ? this.lookup.get(vs)! : null;
    });
  }

  getColors(row: IDataRow) {
    return this.getCategories(row).map((d) => (d ? this.colorMapping.apply(d) : DEFAULT_COLOR));
  }

  iterCategory(row: IDataRow) {
    return this.getCategories(row);
  }

  getValues(row: IDataRow) {
    return this.getCategories(row).map((v) => (v ? v.name : null));
  }

  getLabels(row: IDataRow) {
    return this.getCategories(row).map((v) => (v ? v.label : ''));
  }

  getColorMapping() {
    return this.colorMapping.clone();
  }

  setColorMapping(mapping: ICategoricalColorMappingFunction) {
    return CategoricalColumn.prototype.setColorMapping.call(this, mapping);
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row: IDataRow): boolean {
    if (!this.currentFilter) {
      return true;
    }
    const categories = this.getCategories(row).filter((d): d is ICategory => d != null);
    if (categories.length === 0) {
      return isCategoryIncluded(this.currentFilter, null);
    }
    if (this.currentFilter.mode === 'every') {
      const filterObj = this.currentFilter.filter;
      if (Array.isArray(filterObj)) {
        if (filterObj.length === 0) {
          return false;
        }
        const present = new Set(categories.map((c) => c.name));
        return filterObj.every((name) => present.has(name));
      }
      // fallback for string / regex filter modes
      return categories.every((c) => isCategoryIncluded(this.currentFilter, c));
    }
    return categories.some((c) => isCategoryIncluded(this.currentFilter, c));
  }

  getFilter(): ISetCategoricalFilter | null {
    return this.currentFilter == null ? null : Object.assign({}, this.currentFilter);
  }

  setFilter(filter: ISetCategoricalFilter | null) {
    if (isEqualSetCategoricalFilter(this.currentFilter, filter)) {
      return;
    }
    this.fire(
      [CategoricalsColumn.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY],
      this.currentFilter,
      (this.currentFilter = filter)
    );
  }

  clearFilter() {
    const was = this.isFiltered();
    this.setFilter(null);
    return was;
  }

  toCompareValue(row: IDataRow) {
    const categories = this.getCategories(row).filter((d): d is ICategory => d != null);
    if (categories.length === 0) {
      return [0, 0, ''];
    }

    // count-aware (duplicates matter): primary = total count, secondary = #unique, tie-break = stable signature
    const counts = new Map<string, number>();
    for (const c of categories) {
      counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
    }

    const signature = Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      // fixed width so lexical order matches numeric order (e.g., 2 vs 10)
      .map(([name, count]) => {
        const c = String(count);
        const padded = c.length >= 9 ? c : `000000000${c}`.slice(-9);
        return `${name}:${padded}`;
      })
      .join('\u0001');

    return [categories.length, counts.size, signature];
  }

  toCompareValueType() {
    return [ECompareValueType.UINT32, chooseUIntByDataLength(this.categories.length), ECompareValueType.STRING];
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.filter = this.currentFilter;
    r.colorMapping = this.colorMapping.toJSON();
    return r;
  }

  restore(dump: any, factory: ITypeFactory) {
    super.restore(dump, factory);
    this.colorMapping = factory.categoricalColorMappingFunction(dump.colorMapping, this.categories);

    if (!('filter' in dump)) {
      this.currentFilter = null;
      return;
    }
    const bak = dump.filter;
    if (typeof bak === 'string' || Array.isArray(bak)) {
      this.currentFilter = { filter: bak, filterMissing: false, mode: 'some' };
    } else {
      this.currentFilter = bak;
    }
  }
}
