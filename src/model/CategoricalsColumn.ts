import ArrayColumn, {IArrayColumnDesc} from './ArrayColumn';
import {ICategoricalDesc, ICategory, ICategoricalColorMappingFunction, ICategoricalsColumn} from './ICategoricalColumn';
import {IDataRow, DEFAULT_COLOR, ITypeFactory} from './interfaces';
import {toolbar} from './annotations';
import CategoricalColumn from './CategoricalColumn';
import {DEFAULT_CATEGORICAL_COLOR_FUNCTION} from './CategoricalColorMappingFunction';
import ValueColumn, {dataLoaded} from './ValueColumn';
import Column, {labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged, widthChanged, dirtyCaches} from './Column';
import {IEventListener} from '../internal';
import {toCategories} from './internalCategorical';

export declare type ICategoricalsColumnDesc = ICategoricalDesc & IArrayColumnDesc<string | null>;

/**
 * emitted when the color mapping property changes
 * @asMemberOf CategoricalsColumn
 * @event
 */
export declare function colorMappingChanged_CCS(previous: ICategoricalColorMappingFunction, current: ICategoricalColorMappingFunction): void;

/**
 * a string column with optional alignment
 */
@toolbar('colorMappedCategorical')
export default class CategoricalsColumn extends ArrayColumn<string | null> implements ICategoricalsColumn {
  static readonly EVENT_COLOR_MAPPING_CHANGED = CategoricalColumn.EVENT_COLOR_MAPPING_CHANGED;

  readonly categories: ICategory[];

  private readonly lookup = new Map<string, Readonly<ICategory>>();

  private colorMapping: ICategoricalColorMappingFunction;

  constructor(id: string, desc: Readonly<ICategoricalsColumnDesc>) {
    super(id, desc);
    this.categories = toCategories(desc);
    this.categories.forEach((d) => this.lookup.set(d.name, d));
    this.colorMapping = DEFAULT_CATEGORICAL_COLOR_FUNCTION;
  }

  protected createEventList() {
    return super.createEventList().concat([CategoricalsColumn.EVENT_COLOR_MAPPING_CHANGED]);
  }

  on(type: typeof CategoricalsColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged_CCS | null): this;
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
    return this.getCategories(row).map((d) => d ? this.colorMapping.apply(d) : DEFAULT_COLOR);
  }

  iterCategory(row: IDataRow) {
    return this.getCategories(row);
  }

  getValues(row: IDataRow) {
    return this.getCategories(row).map((v) => v ? v.name : null);
  }

  getLabels(row: IDataRow) {
    return this.getCategories(row).map((v) => v ? v.label : '');
  }

  getColorMapping() {
    return this.colorMapping.clone();
  }

  setColorMapping(mapping: ICategoricalColorMappingFunction) {
    return CategoricalColumn.prototype.setColorMapping.call(this, mapping);
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.colorMapping = this.colorMapping.toJSON();
    return r;
  }

  restore(dump: any, factory: ITypeFactory) {
    super.restore(dump, factory);
    this.colorMapping = factory.categoricalColorMappingFunction(dump.colorMapping, this.categories);
  }
}
