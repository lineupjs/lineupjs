import ArrayColumn, {IArrayColumnDesc} from './ArrayColumn';
import {ISetColumn, ICategoricalColorMappingFunction} from './ICategoricalColumn';
import {IDataRow, DEFAULT_COLOR} from './interfaces';
import CategoricalColumn from './CategoricalColumn';
import {DEFAULT_COLOR_FUNCTION, restoreColorMapping} from './CategoricalColorMappingFunction';
import ValueColumn, {dataLoaded} from './ValueColumn';
import Column, {labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged, widthChanged, dirtyCaches} from './Column';
import {IEventListener} from '../internal';
import {chooseUIntByDataLength} from './internal';
import {toCategory} from './internalCategorical';


export declare type IBooleansColumnDesc = IArrayColumnDesc<boolean>;

/**
 * emitted when the color mapping property changes
 * @asMemberOf BooleansColumn
 * @event
 */
declare function colorMappingChanged(previous: ICategoricalColorMappingFunction, current: ICategoricalColorMappingFunction): void;


export default class BooleansColumn extends ArrayColumn<boolean> implements ISetColumn {
  static readonly EVENT_COLOR_MAPPING_CHANGED = CategoricalColumn.EVENT_COLOR_MAPPING_CHANGED;

  private colorMapping: ICategoricalColorMappingFunction;

  constructor(id: string, desc: Readonly<IBooleansColumnDesc>) {
    super(id, desc);
    this.setDefaultRenderer('upset');
    this.colorMapping = DEFAULT_COLOR_FUNCTION;
  }

  get categories() {
    return this.labels.map((d, i) => toCategory(d, i));
  }

  getSet(row: IDataRow) {
    const vs = this.getValues(row);
    return new Set(this.categories.filter((_, i) => vs[i]));
  }

  toCompareValue(row: IDataRow) {
    const v = this.getValue(row);
    if (v == null) {
      return NaN;
    }
    return v.reduce((a, b) => a + (b ? 1 : 0), 0);
  }

  toCompareValueType() {
    return chooseUIntByDataLength(this.dataLength);
  }

  getCategories(row: IDataRow) {
    const categories = this.categories;
    return super.getValues(row).map((v, i) => {
      return v ? categories[i]! : null;
    });
  }

  iterCategory(row: IDataRow) {
    return this.getCategories(row);
  }

  getColors(row: IDataRow) {
    return this.getCategories(row).map((d) => d ? this.colorMapping.apply(d) : DEFAULT_COLOR);
  }


  protected createEventList() {
    return super.createEventList().concat([BooleansColumn.EVENT_COLOR_MAPPING_CHANGED]);
  }

  on(type: typeof BooleansColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged | null): this;
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
