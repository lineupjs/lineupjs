import { Category, toolbar } from './annotations';
import CategoricalColumn from './CategoricalColumn';
import Column, {
  widthChanged,
  labelChanged,
  metaDataChanged,
  dirty,
  dirtyHeader,
  dirtyValues,
  rendererTypeChanged,
  groupRendererChanged,
  summaryRendererChanged,
  visibilityChanged,
  dirtyCaches,
} from './Column';
import type { dataLoaded } from './ValueColumn';
import ValueColumn from './ValueColumn';
import type {
  ICategoricalColumn,
  ICategory,
  ICategoricalColorMappingFunction,
  ICategoricalFilter,
} from './ICategoricalColumn';
import { IDataRow, ECompareValueType, IValueColumnDesc, ITypeFactory } from './interfaces';
import type { IEventListener } from '../internal';
import { DEFAULT_CATEGORICAL_COLOR_FUNCTION } from './CategoricalColorMappingFunction';
import { integrateDefaults } from './internal';
import { missingGroup } from './missing';
import { isCategoryIncluded, isEqualCategoricalFilter } from './internalCategorical';

export interface IBooleanDesc {
  /**
   * string to show for true
   * @default ✓
   */
  trueMarker?: string;
  /**
   * string to show for false
   * @default (empty)
   */
  falseMarker?: string;
}

export declare type IBooleanColumnDesc = IValueColumnDesc<boolean> & IBooleanDesc;

/**
 * emitted when the color mapping property changes
 * @asMemberOf BooleanColumn
 * @event
 */
export declare function colorMappingChanged_BC(
  previous: ICategoricalColorMappingFunction,
  current: ICategoricalColorMappingFunction
): void;

/**
 * emitted when the filter property changes
 * @asMemberOf BooleanColumn
 * @event
 */
export declare function filterChanged_BC(previous: ICategoricalFilter | null, current: ICategoricalFilter | null): void;

/**
 * a string column with optional alignment
 */
@toolbar('rename', 'clone', 'sort', 'sortBy', 'group', 'groupBy', 'filterCategorical', 'colorMappedCategorical')
@Category('categorical')
export default class BooleanColumn extends ValueColumn<boolean> implements ICategoricalColumn {
  static readonly EVENT_FILTER_CHANGED = 'filterChanged';
  static readonly EVENT_COLOR_MAPPING_CHANGED = 'colorMappingChanged';

  static readonly GROUP_TRUE = { name: 'True', color: '#444444' };
  static readonly GROUP_FALSE = { name: 'False', color: '#dddddd' };

  private currentFilter: ICategoricalFilter | null = null;

  private colorMapping: ICategoricalColorMappingFunction;
  readonly categories: ICategory[];

  constructor(id: string, desc: Readonly<IBooleanColumnDesc>) {
    super(
      id,
      integrateDefaults(desc, {
        width: 30,
        renderer: 'categorical',
        groupRenderer: 'categorical',
        summaryRenderer: 'categorical',
      })
    );
    this.categories = [
      {
        name: desc.trueMarker ?? '✓',
        color: BooleanColumn.GROUP_TRUE.color,
        label: BooleanColumn.GROUP_TRUE.name,
        value: 0,
      },
      {
        name: desc.falseMarker ?? '',
        color: BooleanColumn.GROUP_FALSE.color,
        label: BooleanColumn.GROUP_FALSE.name,
        value: 1,
      },
    ];
    this.colorMapping = DEFAULT_CATEGORICAL_COLOR_FUNCTION;
  }

  protected createEventList() {
    return super
      .createEventList()
      .concat([BooleanColumn.EVENT_COLOR_MAPPING_CHANGED, BooleanColumn.EVENT_FILTER_CHANGED]);
  }

  on(type: typeof BooleanColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged_BC | null): this;
  on(type: typeof BooleanColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged_BC | null): this;
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

  get dataLength() {
    return this.categories.length;
  }

  get labels() {
    return this.categories.map((d) => d.label);
  }

  getValue(row: IDataRow) {
    const v: any = super.getValue(row);
    if (typeof v === 'undefined' || v == null) {
      return null;
    }
    return v === true || v === 'true' || v === 'yes' || v === 'x';
  }

  getCategoryOfBoolean(v: boolean | null) {
    return v == null ? null : this.categories[v ? 0 : 1];
  }

  getCategory(row: IDataRow) {
    const v = this.getValue(row);
    return v == null ? null : this.categories[v ? 0 : 1];
  }

  getCategories(row: IDataRow) {
    return [this.getCategory(row)];
  }

  iterCategory(row: IDataRow) {
    return [this.getCategory(row)];
  }

  getColor(row: IDataRow) {
    return CategoricalColumn.prototype.getColor.call(this, row);
  }

  getLabel(row: IDataRow) {
    return CategoricalColumn.prototype.getLabel.call(this, row);
  }

  getLabels(row: IDataRow) {
    return CategoricalColumn.prototype.getLabels.call(this, row);
  }

  getValues(row: IDataRow) {
    return CategoricalColumn.prototype.getValues.call(this, row);
  }

  getMap(row: IDataRow) {
    return CategoricalColumn.prototype.getMap.call(this, row);
  }

  getMapLabel(row: IDataRow) {
    return CategoricalColumn.prototype.getMapLabel.call(this, row);
  }

  getSet(row: IDataRow) {
    const v = this.getValue(row);
    const r = new Set<ICategory>();
    if (v != null) {
      r.add(this.categories[v ? 0 : 1]);
    }
    return r;
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.colorMapping = this.colorMapping.toJSON();
    if (this.currentFilter != null) {
      r.filter = this.currentFilter;
    }
    return r;
  }

  restore(dump: any, factory: ITypeFactory) {
    super.restore(dump, factory);
    this.colorMapping = factory.categoricalColorMappingFunction(dump.colorMapping, this.categories);
    if (typeof dump.filter === 'boolean') {
      this.currentFilter = {
        filter: [this.getCategoryOfBoolean(dump.filter)!.name],
        filterMissing: false,
      };
    } else if (typeof dump.filter !== 'undefined') {
      this.currentFilter = dump.filter;
    }
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

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row: IDataRow) {
    return isCategoryIncluded(this.currentFilter, this.getCategory(row));
  }

  getFilter() {
    return this.currentFilter == null ? null : Object.assign({}, this.currentFilter);
  }

  setFilter(filter: boolean | null | ICategoricalFilter) {
    const f: ICategoricalFilter | null =
      typeof filter === 'boolean'
        ? { filter: [this.getCategoryOfBoolean(filter)!.name], filterMissing: false }
        : filter;
    if (isEqualCategoricalFilter(this.currentFilter, f)) {
      return;
    }
    this.fire(
      [BooleanColumn.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY],
      this.currentFilter,
      (this.currentFilter = f)
    );
  }

  clearFilter() {
    const was = this.isFiltered();
    this.setFilter(null);
    return was;
  }

  toCompareValue(row: IDataRow) {
    const v = this.getValue(row);
    if (v == null) {
      return NaN;
    }
    return v ? 1 : 0;
  }

  toCompareValueType(): ECompareValueType {
    return ECompareValueType.BINARY;
  }

  group(row: IDataRow) {
    const v = this.getValue(row);
    if (v == null) {
      return Object.assign({}, missingGroup);
    }
    return Object.assign({}, v ? BooleanColumn.GROUP_TRUE : BooleanColumn.GROUP_FALSE);
  }
}
