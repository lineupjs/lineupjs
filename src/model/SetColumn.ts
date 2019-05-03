import {Category, toolbar} from './annotations';
import CategoricalColumn from './CategoricalColumn';
import Column, {labelChanged, metaDataChanged, dirty, widthChanged, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged, dirtyCaches} from './Column';
import {IArrayColumn} from './IArrayColumn';
import {ICategoricalDesc, ICategoricalFilter, ICategory, ISetColumn, ICategoricalColorMappingFunction} from './ICategoricalColumn';
import {IDataRow, ECompareValueType, IValueColumnDesc, IGroup, DEFAULT_COLOR, ITypeFactory} from './interfaces';
import ValueColumn, {dataLoaded} from './ValueColumn';
import {IEventListener} from '../internal';
import {DEFAULT_CATEGORICAL_COLOR_FUNCTION} from './CategoricalColorMappingFunction';
import {toCategories, isCategoryIncluded} from './internalCategorical';
import {chooseUIntByDataLength} from './internal';

export interface ISetDesc extends ICategoricalDesc {
  separator?: string;
}

export declare type ISetColumnDesc = ISetDesc & IValueColumnDesc<string[]>;

/**
 * emitted when the color mapping property changes
 * @asMemberOf SetColumn
 * @event
 */
export declare function colorMappingChanged_SSC(previous: ICategoricalColorMappingFunction, current: ICategoricalColorMappingFunction): void;


/**
 * emitted when the filter property changes
 * @asMemberOf SetColumn
 * @event
 */
export declare function filterChanged_SSC(previous: ICategoricalFilter | null, current: ICategoricalFilter | null): void;

/**
 * a string column with optional alignment
 */
@toolbar('filterCategorical', 'colorMappedCategorical', 'group', 'groupBy')
@Category('categorical')
export default class SetColumn extends ValueColumn<string[]> implements IArrayColumn<boolean>, ISetColumn {
  static readonly EVENT_FILTER_CHANGED = CategoricalColumn.EVENT_FILTER_CHANGED;
  static readonly EVENT_COLOR_MAPPING_CHANGED = CategoricalColumn.EVENT_COLOR_MAPPING_CHANGED;

  readonly categories: ICategory[];

  private readonly separator: RegExp;

  private readonly lookup = new Map<string, Readonly<ICategory>>();

  private colorMapping: ICategoricalColorMappingFunction;
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
    this.setSummaryRenderer('categorical');
    this.colorMapping = DEFAULT_CATEGORICAL_COLOR_FUNCTION;
  }

  protected createEventList() {
    return super.createEventList().concat([SetColumn.EVENT_COLOR_MAPPING_CHANGED, SetColumn.EVENT_FILTER_CHANGED]);
  }

  on(type: typeof SetColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged_SSC | null): this;
  on(type: typeof SetColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged_SSC | null): this;
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
    return super.on(<any>type, listener);
  }

  get labels() {
    return this.categories.map((d) => d.label);
  }

  get dataLength() {
    return this.categories.length;
  }

  getValue(row: IDataRow): string[] | null {
    const v = this.getSortedSet(row);
    if (v.length === 0) {
      return null;
    }
    return v.map((d) => d.name);
  }

  getLabel(row: IDataRow) {
    return `(${this.getSortedSet(row).map((d) => d.label).join(',')})`;
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

  getSortedSet(row: IDataRow) {
    return Array.from(this.getSet(row)).sort((a, b) => a.value === b.value ? a.label.localeCompare(b.label) : a.value - b.value);
  }

  getCategories(row: IDataRow) {
    return this.getSortedSet(row);
  }

  getColors(row: IDataRow) {
    return this.getSortedSet(row).map((d) => this.colorMapping.apply(d));
  }

  getColorMapping() {
    return this.colorMapping.clone();
  }

  setColorMapping(mapping: ICategoricalColorMappingFunction) {
    return CategoricalColumn.prototype.setColorMapping.call(this, mapping);
  }


  getValues(row: IDataRow) {
    const s = this.getSet(row);
    return this.categories.map((d) => s.has(d));
  }

  getLabels(row: IDataRow) {
    return this.getValues(row).map(String);
  }

  getMap(row: IDataRow) {
    return this.getSortedSet(row).map((d) => ({key: d.label, value: true}));
  }

  getMapLabel(row: IDataRow) {
    return this.getSortedSet(row).map((d) => ({key: d.label, value: 'true'}));
  }

  iterCategory(row: IDataRow) {
    const r = this.getSet(row);
    if (r.size > 0) {
      return Array.from(r);
    }
    return [null];
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
    const v = Array.from(this.getSet(row));
    if (v.length === 0) {
      return isCategoryIncluded(this.currentFilter, null);
    }
    return v.every((s) => isCategoryIncluded(this.currentFilter, s));
  }

  getFilter() {
    return CategoricalColumn.prototype.getFilter.call(this);
  }

  setFilter(filter: ICategoricalFilter | null) {
    return CategoricalColumn.prototype.setFilter.call(this, filter);
  }

  clearFilter() {
    return CategoricalColumn.prototype.clearFilter.call(this);
  }

  toCompareValue(row: IDataRow) {
    const v = this.getSet(row);

    const vs = [v.size];
    for (const cat of this.categories) {
      vs.push(v.has(cat) ? 1 : 0);
    }
    return vs;
  }

  toCompareValueType() {
    return [chooseUIntByDataLength(this.categories.length)].concat(this.categories.map(() => ECompareValueType.BINARY));
  }

  group(row: IDataRow): IGroup {
    const v = this.getSet(row);
    const cardinality = v.size;
    const categories = this.categories.filter((c) => v.has(c));

    // by cardinality and then by intersection

    const g: IGroup = {
      name: categories.length === 0 ? 'None' : categories.map((d) => d.name).join(', '),
      color: categories.length === 1 ? categories[0].color : DEFAULT_COLOR
    };

    g.parent = {
      name: `#${cardinality}`,
      color: DEFAULT_COLOR,
      subGroups: [g]
    };

    return g;
  }
}
