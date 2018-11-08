import {IAdvancedBoxPlotData} from '../internal';
import {suffix, IEventListener} from '../internal/AEventDispatcher';
import {toolbar, dialogAddons, SortByDefault} from './annotations';
import Column, {IColumnDesc, widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import CompositeColumn, {addColumn, filterChanged, moveColumn, removeColumn} from './CompositeColumn';
import {IKeyValue} from './IArrayColumn';
import {IDataRow, IGroupData} from './interfaces';
import {EAdvancedSortMethod, INumberFilter, INumbersColumn, isNumbersColumn, noNumberFilter} from './INumberColumn';
import {IMappingFunction, ScaleMappingFunction, isMapAbleColumn} from './MappingFunction';
import NumbersColumn, {mappingChanged} from './NumbersColumn';
import {colorMappingChanged} from './NumberColumn';
import {DEFAULT_COLOR_FUNCTION, IColorMappingFunction} from './ColorMappingFunction';


/**
 *  factory for creating a description creating a max column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createImpositionsDesc(label: string = 'Imposition') {
  return {type: 'impositions', label};
}

/**
 * implementation of a combine column, standard operations how to select
 */
@toolbar('filterNumber', 'colorMapped', 'editMapping')
@dialogAddons('sort', 'sortNumbers')
@SortByDefault('descending')
export default class ImpositionCompositesColumn extends CompositeColumn implements INumbersColumn {
  static readonly EVENT_MAPPING_CHANGED = NumbersColumn.EVENT_MAPPING_CHANGED;
  static readonly EVENT_COLOR_MAPPING_CHANGED = NumbersColumn.EVENT_COLOR_MAPPING_CHANGED;

  constructor(id: string, desc: Readonly<IColumnDesc>) {
    super(id, desc);

    this.setDefaultRenderer('numbers');
    this.setDefaultGroupRenderer('numbers');
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
    return `${c[0].label} (${c.slice(1).map((c) => c.label).join(', ')})`;
  }

  private get wrapper(): INumbersColumn | null {
    const c = this._children;
    return c.length === 0 ? null : <INumbersColumn>c[0];
  }

  getLabel(row: IDataRow) {
    const c = this._children;
    if (c.length === 0) {
      return '';
    }
    if (c.length === 1) {
      return c[0].getLabel(row);
    }
    return `${c[0].getLabel(row)} (${c.slice(1).map((c) => `${c.label} = ${c.getLabel(row)}`)})`;
  }

  getColor(row: IDataRow) {
    const c = this._children;
    switch(c.length) {
      case 0:
        return Column.DEFAULT_COLOR;
      case 1:
        return c[0].getColor(row);
      default:
        return c[1].getColor(row);
    }
  }

  protected createEventList() {
    return super.createEventList().concat([ImpositionCompositesColumn.EVENT_MAPPING_CHANGED, ImpositionCompositesColumn.EVENT_COLOR_MAPPING_CHANGED]);
  }

  on(type: typeof ImpositionCompositesColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged | null): this;
  on(type: typeof ImpositionCompositesColumn.EVENT_MAPPING_CHANGED, listener: typeof mappingChanged | null): this;
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
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }

  get labels() {
    const w = this.wrapper;
    return w ? w.labels : [];
  }

  get dataLength() {
    const w = this.wrapper;
    return w ? w.dataLength : null;
  }

  getValue(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getValue(row) : [];
  }

  getNumber(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getNumber(row) : NaN;
  }

  getRawNumber(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getRawNumber(row) : NaN;
  }

  getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    if (format === 'json') {
      if (this.isMissing(row)) {
        return null;
      }
      return {
        label: this.getLabels(row),
        color: this.getColor(row),
        value: this.getRawNumbers(row)
      };
    }
    return super.getExportValue(row, format);
  }

  getNumbers(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getNumbers(row) : [];
  }

  getRawNumbers(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getRawNumbers(row) : [];
  }

  getBoxPlotData(row: IDataRow): IAdvancedBoxPlotData | null {
    const w = this.wrapper;
    return w ? w.getBoxPlotData(row) : null;
  }

  getRawBoxPlotData(row: IDataRow): IAdvancedBoxPlotData | null {
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
    return w ? w.getSortMethod() : EAdvancedSortMethod.min;
  }

  setSortMethod(value: EAdvancedSortMethod) {
    const w = this.wrapper;
    return w ? w.setSortMethod(value) : undefined;
  }

  isMissing(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.isMissing(row) : true;
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

  setFilter(value?: INumberFilter): void {
    const w = this.wrapper;
    return w ? w.setFilter(value) : undefined;
  }

  getRange(): [string, string] {
    const w = this.wrapper;
    return w ? w.getRange() : ['0', '1'];
  }

  getMap(row: IDataRow): IKeyValue<number>[] {
    const w = this.wrapper;
    return w ? w.getMap(row) : [];
  }

  getMapLabel(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getMapLabel(row) : [];
  }

  getLabels(row: IDataRow): string[] {
    const w = this.wrapper;
    return w ? w.getLabels(row) : [];
  }

  getValues(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.getValues(row) : [];
  }

  compare(a: IDataRow, b: IDataRow) {
    return NumbersColumn.prototype.compare.call(this, a, b);
  }

  group(row: IDataRow) {
    return NumbersColumn.prototype.group.call(this, row);
  }

  groupCompare(a: IGroupData, b: IGroupData) {
    return NumbersColumn.prototype.groupCompare.call(this, a, b);
  }

  insert(col: Column, index: number): Column | null {
    if (this._children.length === 0 && !isNumbersColumn(col)) {
      return null;
    }
    if (this._children.length >= 2) {
      // limit to two
      return null;
    }
    return super.insert(col, index);
  }

  protected insertImpl(col: Column, index: number) {
    if (isNumbersColumn(col)) {
      this.forward(col, ...suffix('.impose', NumbersColumn.EVENT_MAPPING_CHANGED));
    }
    if (isMapAbleColumn(col)) {
      this.forward(col, ...suffix('.impose', NumbersColumn.EVENT_COLOR_MAPPING_CHANGED));
    }
    return super.insertImpl(col, index);
  }

  protected removeImpl(child: Column, index: number) {
    if (isNumbersColumn(child)) {
      this.unforward(child, ...suffix('.impose', NumbersColumn.EVENT_MAPPING_CHANGED));
    }
    if (isMapAbleColumn(child)) {
      this.unforward(child, ...suffix('.impose', NumbersColumn.EVENT_COLOR_MAPPING_CHANGED));
    }
    return super.removeImpl(child, index);
  }
}
