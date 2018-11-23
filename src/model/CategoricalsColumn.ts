import ArrayColumn, {IArrayColumnDesc, spliceChanged} from './ArrayColumn';
import {ICategoricalDesc, ICategory, toCategories, toCategory} from './ICategoricalColumn';
import {IDataRow} from './interfaces';
import {toolbar} from './annotations';
import CategoricalColumn from './CategoricalColumn';
import {ICategoricalColorMappingFunction, DEFAULT_COLOR_FUNCTION, restoreColorMapping} from './CategoricalColorMappingFunction';
import ValueColumn, {dataLoaded} from './ValueColumn';
import Column, {labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged, widthChanged} from './Column';
import {IEventListener} from '../internal/AEventDispatcher';

export declare type ICategoricalsColumnDesc = ICategoricalDesc & IArrayColumnDesc<string | null>;

/**
 * emitted when the color mapping property changes
 * @asMemberOf CategoricalsColumn
 * @event
 */
export declare function colorMappingChanged(previous: ICategoricalColorMappingFunction, current: ICategoricalColorMappingFunction): void;

/**
 * a string column with optional alignment
 */
@toolbar('colorMappedCategorical')
export default class CategoricalsColumn extends ArrayColumn<string | null> {
  static readonly EVENT_COLOR_MAPPING_CHANGED = CategoricalColumn.EVENT_COLOR_MAPPING_CHANGED;

  readonly categories: ICategory[];

  private readonly missingCategory: ICategory | null;

  private readonly lookup = new Map<string, Readonly<ICategory>>();

  private colorMapping: ICategoricalColorMappingFunction;

  constructor(id: string, desc: Readonly<ICategoricalsColumnDesc>) {
    super(id, desc);
    this.categories = toCategories(desc);
    this.missingCategory = desc.missingCategory ? toCategory(desc.missingCategory, NaN) : null;
    this.categories.forEach((d) => this.lookup.set(d.name, d));
    this.colorMapping = DEFAULT_COLOR_FUNCTION;
  }

  protected createEventList() {
    return super.createEventList().concat([CategoricalsColumn.EVENT_COLOR_MAPPING_CHANGED]);
  }

  on(type: typeof CategoricalsColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged | null): this;
  on(type: typeof ArrayColumn.EVENT_SPLICE_CHANGED, listener: typeof spliceChanged | null): this;
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

  getCategories(row: IDataRow) {
    return super.getValues(row).map((v) => {
      if (!v) {
        return this.missingCategory;
      }
      const vs = String(v);
      return this.lookup.has(vs) ? this.lookup.get(vs)! : this.missingCategory;
    });
  }

  getColors(row: IDataRow) {
    return this.getCategories(row).map((d) => d ? this.colorMapping.apply(d): Column.DEFAULT_COLOR);
  }

  getSet(row: IDataRow) {
    const r = new Set(this.getCategories(row));
    r.delete(this.missingCategory);
    return r;
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
    r.colorMapping = this.colorMapping.dump();
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    this.colorMapping = restoreColorMapping(dump.colorMapping, this.categories);
  }
}
