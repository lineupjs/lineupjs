import type { IEventListener, ISequence } from '../internal';
import { Category, toolbar } from './annotations';
import { DEFAULT_CATEGORICAL_COLOR_FUNCTION } from './CategoricalColorMappingFunction';
import Column, {
  dirty,
  dirtyCaches,
  dirtyHeader,
  dirtyValues,
  groupRendererChanged,
  labelChanged,
  metaDataChanged,
  rendererTypeChanged,
  summaryRendererChanged,
  visibilityChanged,
  widthChanged,
  DEFAULT_COLOR,
} from './Column';
import type {
  ICategoricalColumn,
  ICategoricalColumnDesc,
  ICategoricalFilter,
  ICategory,
  ICategoricalColorMappingFunction,
} from './ICategoricalColumn';
import {
  type IDataRow,
  type IGroup,
  type ICompareValue,
  type ITypeFactory,
  ECompareValueType,
  type IColumnDump,
} from './interfaces';
import { missingGroup } from './missing';
import type { dataLoaded } from './ValueColumn';
import ValueColumn from './ValueColumn';
import {
  toCategories,
  isCategoryIncluded,
  isEqualCategoricalFilter,
  toCompareCategoryValue,
  toGroupCompareCategoryValue,
  compareCategory,
} from './internalCategorical';
import { restoreTypedValue, restoreValue } from './diff';

/**
 * emitted when the color mapping property changes
 * @asMemberOf CategoricalColumn
 * @event
 */
export declare function colorMappingChanged_CC(
  previous: ICategoricalColorMappingFunction,
  current: ICategoricalColorMappingFunction
): void;

/**
 * emitted when the filter property changes
 * @asMemberOf CategoricalColumn
 * @event
 */
export declare function filterChanged_CC(previous: ICategoricalFilter | null, current: ICategoricalFilter | null): void;

/**
 * column for categorical values
 */
@toolbar(
  'rename',
  'clone',
  'sort',
  'sortBy',
  'group',
  'groupBy',
  'sortGroupBy',
  'filterCategorical',
  'colorMappedCategorical'
)
@Category('categorical')
export default class CategoricalColumn extends ValueColumn<string> implements ICategoricalColumn {
  static readonly EVENT_FILTER_CHANGED = 'filterChanged';
  static readonly EVENT_COLOR_MAPPING_CHANGED = 'colorMappingChanged';

  readonly categories: ICategory[];

  private colorMapping: ICategoricalColorMappingFunction;

  private readonly lookup = new Map<string, Readonly<ICategory>>();
  /**
   * set of categories to show
   * @type {null}
   * @private
   */
  private currentFilter: ICategoricalFilter | null = null;
  private readonly categoryOrder: ICategoricalColumnDesc['categoryOrder'];

  constructor(id: string, desc: Readonly<ICategoricalColumnDesc>) {
    super(id, desc);
    this.categories = toCategories(desc);
    this.categories.forEach((d) => this.lookup.set(d.name, d));
    this.categoryOrder = desc.categoryOrder || 'given';
    this.colorMapping = DEFAULT_CATEGORICAL_COLOR_FUNCTION;
  }

  override onDataUpdate(rows: ISequence<IDataRow>): void {
    super.onDataUpdate(rows);
    if (Array.isArray((this.desc as ICategoricalColumnDesc).categories) && this.categoryOrder === 'given') {
      return;
    }
    // derive hist
    const categories = new Map<string, { name: string; count: number }>();
    rows.forEach((row) => {
      const value = super.getValue(row);
      if (!value) {
        return;
      }
      const sValue = String(value);
      const entry = categories.get(sValue);
      if (!entry) {
        categories.set(sValue, { name: sValue, count: 1 });
      } else {
        entry.count++;
      }
    });

    if (!Array.isArray((this.desc as ICategoricalColumnDesc).categories)) {
      // derive
      const categoryNames = Array.from(categories.keys());
      categoryNames.sort();
      this.categories.splice(0, this.categories.length, ...toCategories({ categories: categoryNames }));
      this.categories.forEach((d) => this.lookup.set(d.name, d));
    }
    this.sortCategories(categories);
  }

  private sortCategories(hist: ReadonlyMap<string, { name: string; count: number }>) {
    // patch values of categories
    for (const cat of this.categories) {
      cat.value = hist.get(cat.name)?.count ?? 0;
    }
    // sort
    if (typeof this.categoryOrder === 'function') {
      this.categories.splice(0, this.categories.length, ...this.categoryOrder(this.categories));
    } else if (this.categoryOrder === 'large-to-small') {
      // revert order of value
      for (const cat of this.categories) {
        cat.value = -1 * cat.value;
      }
      this.categories.sort(compareCategory);
    } else if (this.categoryOrder === 'small-to-large') {
      this.categories.sort(compareCategory);
    }
    // patch the ICategory.value to match the new order
    this.categories.forEach((cat, i) => {
      cat.value = i / this.categories.length;
    });
  }

  protected override createEventList() {
    return super
      .createEventList()
      .concat([CategoricalColumn.EVENT_FILTER_CHANGED, CategoricalColumn.EVENT_COLOR_MAPPING_CHANGED]);
  }

  override on(type: typeof CategoricalColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged_CC | null): this;
  override on(
    type: typeof CategoricalColumn.EVENT_COLOR_MAPPING_CHANGED,
    listener: typeof colorMappingChanged_CC | null
  ): this;
  override on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
  override on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  override on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  override on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  override on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  override on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  override on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  override on(type: typeof Column.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  override on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  override on(
    type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED,
    listener: typeof groupRendererChanged | null
  ): this;
  override on(
    type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED,
    listener: typeof summaryRendererChanged | null
  ): this;
  override on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  override on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  override on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type as any, listener);
  }

  override getValue(row: IDataRow) {
    const v = this.getCategory(row);
    return v ? v.name : null;
  }

  getCategory(row: IDataRow) {
    const v = super.getValue(row);
    if (!v) {
      return null;
    }
    const vs = String(v);
    return this.lookup.has(vs) ? this.lookup.get(vs)! : null;
  }

  get dataLength() {
    return this.categories.length;
  }

  get labels() {
    return this.categories.map((d) => d.label);
  }

  override getLabel(row: IDataRow) {
    const v = this.getCategory(row);
    return v ? v.label : '';
  }

  getCategories(row: IDataRow) {
    const v = this.getCategory(row);
    return [v];
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
    return this.getValues(row).map((value, i) => ({ key: cats[i].label, value }));
  }

  getMapLabel(row: IDataRow) {
    const cats = this.categories;
    return this.getLabels(row).map((value, i) => ({ key: cats[i].label, value }));
  }

  getSet(row: IDataRow) {
    const cat = this.getCategory(row);
    const r = new Set<ICategory>();
    if (cat) {
      r.add(cat);
    }
    return r;
  }

  iterCategory(row: IDataRow) {
    return [this.getCategory(row)];
  }

  override toJSON() {
    const r = super.toJSON();
    r.filter = this.getFilter();
    r.colorMapping = this.colorMapping.toJSON();
    return r;
  }

  override restore(dump: IColumnDump, factory: ITypeFactory): Set<string> {
    const changed = super.restore(dump, factory);

    this.colorMapping = restoreTypedValue(
      dump.colorMapping,
      this.colorMapping,
      (target) => factory.categoricalColorMappingFunction(target, this.categories),
      changed,
      [
        CategoricalColumn.EVENT_COLOR_MAPPING_CHANGED,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
      ]
    );

    this.currentFilter = restoreValue(
      typeof dump.filter === 'string' || Array.isArray(dump.filter)
        ? { filter: dump.filter, filterMissing: false }
        : dump.filter,
      this.currentFilter,
      changed,
      [CategoricalColumn.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY]
    );
    return changed;
  }

  override getColor(row: IDataRow) {
    const v = this.getCategory(row);
    return v ? this.colorMapping.apply(v) : DEFAULT_COLOR;
  }

  getColorMapping() {
    return this.colorMapping.clone();
  }

  setColorMapping(mapping: ICategoricalColorMappingFunction) {
    if (this.colorMapping.eq(mapping)) {
      return;
    }
    this.fire(
      [
        CategoricalColumn.EVENT_COLOR_MAPPING_CHANGED,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY,
      ],
      this.colorMapping.clone(),
      (this.colorMapping = mapping)
    );
  }

  override isFiltered() {
    return this.currentFilter != null;
  }

  override filter(row: IDataRow, valueCache?: any): boolean {
    return isCategoryIncluded(this.currentFilter, valueCache !== undefined ? valueCache : this.getCategory(row));
  }

  getFilter() {
    return this.currentFilter == null ? null : Object.assign({}, this.currentFilter);
  }

  setFilter(filter: ICategoricalFilter | null) {
    if (isEqualCategoricalFilter(this.currentFilter, filter)) {
      return;
    }
    this.fire(
      [CategoricalColumn.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY],
      this.currentFilter,
      (this.currentFilter = filter)
    );
  }

  override clearFilter() {
    const was = this.isFiltered();
    this.setFilter(null);
    return was;
  }

  override toCompareValue(row: IDataRow, valueCache?: any) {
    return toCompareCategoryValue(valueCache !== undefined ? valueCache : this.getCategory(row));
  }

  override toCompareValueType(): ECompareValueType {
    return ECompareValueType.FLOAT_ASC;
  }

  override group(row: IDataRow, valueCache?: any): IGroup {
    const cat = valueCache !== undefined ? valueCache : this.getCategory(row);
    if (!cat) {
      return Object.assign({}, missingGroup);
    }
    return { name: cat.label, color: cat.color };
  }

  override toCompareGroupValue(
    rows: ISequence<IDataRow>,
    _group: IGroup,
    valueCache?: ISequence<any>
  ): ICompareValue[] {
    return toGroupCompareCategoryValue(rows, this, valueCache);
  }

  override toCompareGroupValueType() {
    return [ECompareValueType.FLOAT, ECompareValueType.STRING];
  }

  override getGroupRenderer() {
    const current = super.getGroupRenderer();
    if (current === this.desc.type && this.isGroupedBy() >= 0) {
      // still the default and the stratification criteria
      return 'catdistributionbar';
    }
    return current;
  }
}
