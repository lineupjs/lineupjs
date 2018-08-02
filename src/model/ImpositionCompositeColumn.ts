import {suffix, IEventListener} from '../internal/AEventDispatcher';
import {toolbar, SortByDefault} from './annotations';
import Column, {IColumnDesc, widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import CompositeColumn, {addColumn, filterChanged, moveColumn, removeColumn} from './CompositeColumn';
import {IDataRow, IGroupData} from './interfaces';
import {isNumberColumn} from './INumberColumn';
import NumberColumn, {INumberColumn, mappingChanged, colorMappingChanged} from './NumberColumn';
import {isMapAbleColumn} from './MappingFunction';


/**
 *  factory for creating a description creating a max column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createImpositionDesc(label: string = 'Imposition') {
  return {type: 'imposition', label};
}

/**
 * implementation of a combine column, standard operations how to select
 */
@toolbar('filterMapped', 'colorMapped')
@SortByDefault('descending')
export default class ImpositionCompositeColumn extends CompositeColumn implements INumberColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;
  static readonly EVENT_COLOR_MAPPING_CHANGED = NumberColumn.EVENT_COLOR_MAPPING_CHANGED;

  constructor(id: string, desc: Readonly<IColumnDesc>) {
    super(id, desc);

    this.setDefaultRenderer('number');
    this.setDefaultGroupRenderer('boxplot');
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

  private get wrapper(): INumberColumn | null {
    const c = this._children;
    return c.length === 0 ? null : <INumberColumn>c[0];
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
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
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
    return `${c[0].getLabel(row)} (${c.slice(1).map((c) => `${c.label} = ${c.getLabel(row)}`).join(', ')})`;
  }

  getColor(row: IDataRow) {
    const c = this._children;
    switch(c.length) {
      case 0:
        return this.color;
      case 1:
        return c[0].getColor(row);
      default:
        return c[1].getColor(row);
    }
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

  isMissing(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.isMissing(row) : true;
  }

  compare(a: IDataRow, b: IDataRow) {
    return NumberColumn.prototype.compare.call(this, a, b);
  }

  group(row: IDataRow) {
    return NumberColumn.prototype.group.call(this, row);
  }

  groupCompare(a: IGroupData, b: IGroupData) {
    return NumberColumn.prototype.groupCompare.call(this, a, b);
  }

  insert(col: Column, index: number): Column | null {
    if (this._children.length === 0 && !isNumberColumn(col)) {
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
