import {IBoxPlotData} from '../internal';
import {suffix, ISequence, IEventListener} from '../internal';
import {toolbar, SortByDefault, dialogAddons} from './annotations';
import BoxPlotColumn from './BoxPlotColumn';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged, dirtyCaches} from './Column';
import CompositeColumn, {addColumn, filterChanged, moveColumn, removeColumn} from './CompositeColumn';
import {IDataRow, IGroup, IColumnDesc, DEFAULT_COLOR} from './interfaces';
import {ESortMethod, IBoxPlotColumn, INumberFilter, isBoxPlotColumn, IMappingFunction, IColorMappingFunction, isMapAbleColumn} from './INumberColumn';
import {ScaleMappingFunction} from './MappingFunction';
import NumbersColumn from './NumbersColumn';
import {DEFAULT_COLOR_FUNCTION} from './ColorMappingFunction';
import {DEFAULT_FORMATTER, noNumberFilter} from './internalNumber';


/**
 *  factory for creating a description creating a max column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createImpositionBoxPlotDesc(label: string = 'Imposition') {
  return {type: 'impositions', label};
}

/**
 * emitted when the mapping property changes
 * @asMemberOf ImpositionBoxPlotColumn
 * @event
 */
declare function mappingChanged(previous: IMappingFunction, current: IMappingFunction): void;

/**
 * emitted when the color mapping property changes
 * @asMemberOf ImpositionBoxPlotColumn
 * @event
 */
declare function colorMappingChanged(previous: IColorMappingFunction, current: IColorMappingFunction): void;


/**
 * implementation of a combine column, standard operations how to select
 */
@toolbar('filterNumber', 'colorMapped', 'editMapping')
@dialogAddons('sort', 'sortBoxPlot')
@SortByDefault('descending')
export default class ImpositionBoxPlotColumn extends CompositeColumn implements IBoxPlotColumn {
  static readonly EVENT_MAPPING_CHANGED = NumbersColumn.EVENT_MAPPING_CHANGED;
  static readonly EVENT_COLOR_MAPPING_CHANGED = NumbersColumn.EVENT_COLOR_MAPPING_CHANGED;

  constructor(id: string, desc: Readonly<IColumnDesc>) {
    super(id, desc);

    this.setDefaultRenderer('boxplot');
    this.setDefaultGroupRenderer('boxplot');
    this.setDefaultSummaryRenderer('boxplot');
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

  private get wrapper(): IBoxPlotColumn | null {
    return <IBoxPlotColumn>this._children.find(isBoxPlotColumn) || null;
  }

  private get rest() {
    const w = this.wrapper;
    return this._children.filter((d) => d !== w);
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
    return `${w ? w.getLabel(row) : '?'} (${rest.map((c) => `${c.label} = ${c.getLabel(row)}`)})`;
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

  protected createEventList() {
    return super.createEventList().concat([ImpositionBoxPlotColumn.EVENT_MAPPING_CHANGED, ImpositionBoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED]);
  }

  on(type: typeof ImpositionBoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged | null): this;
  on(type: typeof ImpositionBoxPlotColumn.EVENT_MAPPING_CHANGED, listener: typeof mappingChanged | null): this;
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

  getNumberFormat() {
    const w = this.wrapper;
    return w ? w.getNumberFormat() : DEFAULT_FORMATTER;
  }

  getValue(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getValue(row) : null;
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

  getBoxPlotData(row: IDataRow): IBoxPlotData | null {
    const w = this.wrapper;
    return w ? w.getBoxPlotData(row) : null;
  }

  getRawBoxPlotData(row: IDataRow): IBoxPlotData | null {
    const w = this.wrapper;
    return w ? w.getRawBoxPlotData(row) : null;
  }

  getMapping() {
    const w = this.wrapper;
    return w ? w.getMapping() : new ScaleMappingFunction();
  }

  getOriginalMapping() {
    const w = this.wrapper;
    return w ? w.getOriginalMapping() : new ScaleMappingFunction();
  }

  getSortMethod() {
    const w = this.wrapper;
    return w ? w.getSortMethod() : ESortMethod.min;
  }

  setSortMethod(value: ESortMethod) {
    const w = this.wrapper;
    return w ? w.setSortMethod(value) : undefined;
  }

  setMapping(mapping: IMappingFunction): void {
    const w = this.wrapper;
    return w ? w.setMapping(mapping) : undefined;
  }

  getColorMapping() {
    const w = this.wrapper;
    return w ? w.getColorMapping() : DEFAULT_COLOR_FUNCTION;
  }

  setColorMapping(mapping: IColorMappingFunction) {
    const w = this.wrapper;
    return w ? w.setColorMapping(mapping) : undefined;
  }

  getFilter() {
    const w = this.wrapper;
    return w ? w.getFilter() : noNumberFilter();
  }

  setFilter(value: INumberFilter | null): void {
    const w = this.wrapper;
    return w ? w.setFilter(value) : undefined;
  }

  getRange(): [string, string] {
    const w = this.wrapper;
    return w ? w.getRange() : ['0', '1'];
  }

  toCompareValue(row: IDataRow) {
    return BoxPlotColumn.prototype.toCompareValue.call(this, row);
  }

  toCompareValueType() {
    return BoxPlotColumn.prototype.toCompareValueType.call(this);
  }

  group(row: IDataRow) {
    return BoxPlotColumn.prototype.group.call(this, row);
  }

  toCompareGroupValue(rows: ISequence<IDataRow>, group: IGroup) {
    return BoxPlotColumn.prototype.toCompareGroupValue.call(this, rows, group);
  }

  toCompareGroupValueType() {
    return BoxPlotColumn.prototype.toCompareGroupValueType.call(this);
  }

  insert(col: Column, index: number): Column | null {
    if (this._children.length === 1 && !this.wrapper && !isBoxPlotColumn(col)) {
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
    if (isBoxPlotColumn(col)) {
      this.forward(col, ...suffix('.impose', BoxPlotColumn.EVENT_MAPPING_CHANGED, BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED));
    } else if (isMapAbleColumn(col)) {
      this.forward(col, ...suffix('.impose', BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED));
    }
    return super.insertImpl(col, index);
  }

  protected removeImpl(child: Column, index: number) {
    if (isBoxPlotColumn(child)) {
      this.unforward(child, ...suffix('.impose', BoxPlotColumn.EVENT_MAPPING_CHANGED, BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED));
    } else if (isMapAbleColumn(child)) {
      this.unforward(child, ...suffix('.impose', BoxPlotColumn.EVENT_COLOR_MAPPING_CHANGED));
    }
    return super.removeImpl(child, index);
  }
}
