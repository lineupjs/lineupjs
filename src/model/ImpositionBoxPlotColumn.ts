import {IBoxPlotData} from '../internal';
import {suffix} from '../internal/AEventDispatcher';
import {toolbar} from './annotations';
import BoxPlotColumn from './BoxPlotColumn';
import Column, {IColumnDesc} from './Column';
import CompositeColumn from './CompositeColumn';
import {ICategoricalColumn, isCategoricalColumn} from './ICategoricalColumn';
import {IDataRow, IGroupData} from './interfaces';
import {ESortMethod, IBoxPlotColumn, INumberFilter, isBoxPlotColumn, noNumberFilter} from './INumberColumn';
import {IMappingFunction, ScaleMappingFunction} from './MappingFunction';
import NumbersColumn from './NumbersColumn';


/**
 *  factory for creating a description creating a max column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createImpositionBoxPlotDesc(label: string = 'Imposition') {
  return {type: 'impositions', label};
}

/**
 * implementation of a combine column, standard operations how to select
 */
@toolbar('sortNumbers', 'filterMapped')
export default class ImpositionBoxPlotColumn extends CompositeColumn implements IBoxPlotColumn {
  static readonly EVENT_MAPPING_CHANGED = NumbersColumn.EVENT_MAPPING_CHANGED;

  constructor(id: string, desc: Readonly<IColumnDesc>) {
    super(id, desc);

    this.setDefaultRenderer('boxplot');
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

  private get wrapper(): IBoxPlotColumn | null {
    const c = this._children;
    return c.length === 0 ? null : <IBoxPlotColumn>c[0];
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
    if (c.length < 2) {
      return this.color;
    }
    const v = (<ICategoricalColumn><any>c[1]).getCategory(row);
    return v ? v.color : this.color;
  }

  protected createEventList() {
    return super.createEventList().concat([ImpositionBoxPlotColumn.EVENT_MAPPING_CHANGED]);
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

  isMissing(row: IDataRow) {
    const w = this.wrapper;
    return w ? w.isMissing(row) : true;
  }

  setMapping(mapping: IMappingFunction): void {
    const w = this.wrapper;
    return w ? w.setMapping(mapping) : undefined;
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

  compare(a: IDataRow, b: IDataRow) {
    return BoxPlotColumn.prototype.compare.call(this, a, b);
  }

  group(row: IDataRow) {
    return BoxPlotColumn.prototype.group.call(this, row);
  }

  groupCompare(a: IGroupData, b: IGroupData) {
    return BoxPlotColumn.prototype.groupCompare.call(this, a, b);
  }

  insert(col: Column, index: number): Column | null {
    if (this._children.length === 0 && !isBoxPlotColumn(col)) {
      return null;
    }
    if (this._children.length === 1 && !isCategoricalColumn(col)) {
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
      this.forward(col, ...suffix('.impose', BoxPlotColumn.EVENT_MAPPING_CHANGED));
    }
    return super.insertImpl(col, index);
  }

  protected removeImpl(child: Column, index: number) {
    if (isBoxPlotColumn(child)) {
      this.unforward(child, ...suffix('.impose', BoxPlotColumn.EVENT_MAPPING_CHANGED));
    }
    return super.removeImpl(child, index);
  }
}
