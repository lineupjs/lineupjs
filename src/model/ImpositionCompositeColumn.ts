import {suffix, IEventListener, ISequence} from '../internal';
import {toolbar, SortByDefault} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged, dirtyCaches} from './Column';
import CompositeColumn, {addColumn, filterChanged, moveColumn, removeColumn} from './CompositeColumn';
import {IDataRow, IGroup, IColumnDesc, DEFAULT_COLOR} from './interfaces';
import {isNumberColumn, INumberColumn, isMapAbleColumn, IColorMappingFunction, IMappingFunction, IMapAbleColumn, INumberFilter} from './INumberColumn';
import NumberColumn from './NumberColumn';
import {DEFAULT_FORMATTER, noNumberFilter} from './internalNumber';
import {ScaleMappingFunction} from './MappingFunction';
import {DEFAULT_COLOR_FUNCTION} from './ColorMappingFunction';


/**
 *  factory for creating a description creating a max column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createImpositionDesc(label: string = 'Imposition') {
  return {type: 'imposition', label};
}

/**
 * emitted when the mapping property changes
 * @asMemberOf ImpositionCompositeColumn
 * @event
 */
declare function mappingChanged(previous: IMappingFunction, current: IMappingFunction): void;

/**
 * emitted when the color mapping property changes
 * @asMemberOf ImpositionCompositeColumn
 * @event
 */
declare function colorMappingChanged(previous: IColorMappingFunction, current: IColorMappingFunction): void;

/**
 * implementation of a combine column, standard operations how to select
 */
@toolbar('filterNumber', 'colorMapped', 'editMapping')
@SortByDefault('descending')
export default class ImpositionCompositeColumn extends CompositeColumn implements INumberColumn, IMapAbleColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;
  static readonly EVENT_COLOR_MAPPING_CHANGED = NumberColumn.EVENT_COLOR_MAPPING_CHANGED;

  constructor(id: string, desc: Readonly<IColumnDesc>) {
    super(id, desc);

    this.setDefaultRenderer('number');
    this.setDefaultGroupRenderer('boxplot');
    this.setDefaultSummaryRenderer('histogram');
  }

  get label() {
    const l = super.getMetaData().label;
    const c = this._children;
    if (l !== 'Imposition' || c.length === 0) {
      return l;
    }
    if (c.length === 1) {
      return c[0].label;
    }
    const w = this.wrapper;
    const rest = this.rest;
    return `${w ? w.label : '?'} (${rest.map((c) => c.label).join(', ')})`;
  }

  private get wrapper(): INumberColumn | null {
    return <INumberColumn>this._children.find(isNumberColumn) || null;
  }

  private get rest() {
    const w = this.wrapper;
    return this._children.filter((d) => d !== w);
  }

  protected createEventList() {
    return super.createEventList().concat([ImpositionCompositeColumn.EVENT_MAPPING_CHANGED, ImpositionCompositeColumn.EVENT_COLOR_MAPPING_CHANGED]);
  }

  on(type: typeof ImpositionCompositeColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged | null): this;
  on(type: typeof ImpositionCompositeColumn.EVENT_MAPPING_CHANGED, listener: typeof mappingChanged | null): this;
  on(type: typeof CompositeColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
  on(type: typeof CompositeColumn.EVENT_ADD_COLUMN, listener: typeof addColumn | null): this;
  on(type: typeof CompositeColumn.EVENT_MOVE_COLUMN, listener: typeof moveColumn | null): this;
  on(type: typeof CompositeColumn.EVENT_REMOVE_COLUMN, listener: typeof removeColumn | null): this;
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
    return super.on(type, listener);
  }

  getLabel(row: IDataRow) {
    const c = this._children;
    if (c.length === 0) {
      return '';
    }
    if (c.length === 1) {
      return c[0].getLabel(row);
    }
    const w = this.wrapper;
    const rest = this.rest;
    return `${w ? w.getLabel(row) : '?'} (${rest.map((c) => `${c.label} = ${c.getLabel(row)}`).join(', ')})`;
  }

  getColor(row: IDataRow) {
    const c = this._children;
    switch (c.length) {
      case 0:
        return DEFAULT_COLOR;
      case 1:
        return c[0].getColor(row);
      default:
        return this.rest[0].getColor(row);
    }
  }

  getNumberFormat() {
    const w = this.wrapper;
    return w ? w.getNumberFormat() : DEFAULT_FORMATTER;
  }

  getValue(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getValue(row) : NaN;
  }

  getNumber(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getNumber(row) : NaN;
  }

  getRawNumber(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getRawNumber(row) : NaN;
  }

  iterNumber(row: IDataRow) {
    return [this.getNumber(row)];
  }

  iterRawNumber(row: IDataRow) {
    return [this.getRawNumber(row)];
  }

  getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    if (format === 'json') {
      const value = this.getRawNumber(row);
      if (isNaN(value)) {
        return null;
      }
      return {
        label: this.getLabel(row),
        color: this.getColor(row),
        value
      };
    }
    return super.getExportValue(row, format);
  }

  getMapping() {
    const w = this.wrapper;
    return w && isMapAbleColumn(w) ? w.getMapping() : new ScaleMappingFunction();
  }

  getOriginalMapping() {
    const w = this.wrapper;
    return w && isMapAbleColumn(w) ? w.getOriginalMapping() : new ScaleMappingFunction();
  }

  setMapping(mapping: IMappingFunction): void {
    const w = this.wrapper;
    return w && isMapAbleColumn(w) ? w.setMapping(mapping) : undefined;
  }

  getColorMapping() {
    const w = this.wrapper;
    return w && isMapAbleColumn(w) ? w.getColorMapping() : DEFAULT_COLOR_FUNCTION;
  }

  setColorMapping(mapping: IColorMappingFunction) {
    const w = this.wrapper;
    return w && isMapAbleColumn(w) ? w.setColorMapping(mapping) : undefined;
  }

  getFilter() {
    const w = this.wrapper;
    return w && isMapAbleColumn(w) ? w.getFilter() : noNumberFilter();
  }

  setFilter(value: INumberFilter | null): void {
    const w = this.wrapper;
    return w && isMapAbleColumn(w) ? w.setFilter(value) : undefined;
  }

  getRange(): [string, string] {
    const w = this.wrapper;
    return w && isMapAbleColumn(w) ? w.getRange() : ['0', '1'];
  }

  toCompareValue(row: IDataRow) {
    return NumberColumn.prototype.toCompareValue.call(this, row);
  }

  toCompareValueType() {
    return NumberColumn.prototype.toCompareValueType.call(this);
  }

  toCompareGroupValue(rows: ISequence<IDataRow>, group: IGroup) {
    return NumberColumn.prototype.toCompareGroupValue.call(this, rows, group);
  }

  toCompareGroupValueType() {
    return NumberColumn.prototype.toCompareGroupValueType.call(this);
  }

  insert(col: Column, index: number): Column | null {
    if (this._children.length === 1 && !this.wrapper && !isNumberColumn(col)) {
      // at least one has to be a number column
      return null;
    }
    if (this._children.length >= 2) {
      // limit to two
      return null;
    }
    return super.insert(col, index);
  }

  protected insertImpl(col: Column, index: number) {
    if (isNumberColumn(col)) {
      this.forward(col, ...suffix('.impose', NumberColumn.EVENT_MAPPING_CHANGED));
    }
    if (isMapAbleColumn(col)) {
      this.forward(col, ...suffix('.impose', NumberColumn.EVENT_COLOR_MAPPING_CHANGED));
    }
    return super.insertImpl(col, index);
  }

  protected removeImpl(child: Column, index: number) {
    if (isNumberColumn(child)) {
      this.unforward(child, ...suffix('.impose', NumberColumn.EVENT_MAPPING_CHANGED));
    }
    if (isMapAbleColumn(child)) {
      this.unforward(child, ...suffix('.impose', NumberColumn.EVENT_COLOR_MAPPING_CHANGED));
    }
    return super.removeImpl(child, index);
  }
}
