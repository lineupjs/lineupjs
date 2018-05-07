import {LazyBoxPlotData} from '../internal';
import {toolbar} from './annotations';
import Column from './Column';
import {IKeyValue} from './IArrayColumn';
import {IDataRow} from './interfaces';
import {isDummyNumberFilter, restoreFilter} from './internal';
import {
  compareBoxPlot, DEFAULT_FORMATTER, EAdvancedSortMethod, getBoxPlotNumber, IAdvancedBoxPlotColumn, INumberDesc,
  INumberFilter, noNumberFilter
} from './INumberColumn';
import {default as MapColumn, IMapColumnDesc} from './MapColumn';
import {createMappingFunction, IMappingFunction, restoreMapping, ScaleMappingFunction} from './MappingFunction';
import {isMissingValue} from './missing';
import NumberColumn from './NumberColumn';
import {IAdvancedBoxPlotData} from '../internal/math';

export interface INumberMapDesc extends INumberDesc {
  readonly sort?: EAdvancedSortMethod;
}

export declare type INumberMapColumnDesc = INumberMapDesc & IMapColumnDesc<number>;

@toolbar('filterMapped', 'sortNumbers')
export default class NumberMapColumn extends MapColumn<number> implements IAdvancedBoxPlotColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;

  private sort: EAdvancedSortMethod;
  private mapping: IMappingFunction;
  private original: IMappingFunction;
  /**
   * currently active filter
   * @type {{min: number, max: number}}
   * @private
   */
  private currentFilter: INumberFilter = noNumberFilter();

  constructor(id: string, desc: Readonly<INumberMapColumnDesc>) {
    super(id, desc);
    this.mapping = restoreMapping(desc);
    this.original = this.mapping.clone();
    this.sort = desc.sort || EAdvancedSortMethod.median;
    this.setDefaultRenderer('mapbars');
  }

  compare(a: IDataRow, b: IDataRow): number {
    return compareBoxPlot(this, a, b);
  }

  getBoxPlotData(row: IDataRow): IAdvancedBoxPlotData | null {
    const data = this.getRawValue(row);
    if (data == null) {
      return null;
    }
    return new LazyBoxPlotData(data.map((d) => d.value), this.mapping);
  }

  getRange() {
    return this.mapping.getRange(DEFAULT_FORMATTER);
  }

  getRawBoxPlotData(row: IDataRow): IAdvancedBoxPlotData | null {
    const data = this.getRawValue(row);
    if (data == null) {
      return null;
    }
    return new LazyBoxPlotData(data.map((d) => d.value));
  }

  getNumber(row: IDataRow): number {
    return getBoxPlotNumber(this, row, 'normalized');
  }

  getRawNumber(row: IDataRow): number {
    return getBoxPlotNumber(this, row, 'raw');
  }

  getValue(row: IDataRow) {
    const values = this.getRawValue(row);
    return values.map(({key, value}) => ({key, value: isMissingValue(value) ? NaN : this.mapping.apply(value)}));
  }

  getRawValue(row: IDataRow): IKeyValue<number>[] {
    const r = super.getValue(row);
    return r == null ? [] : r;
  }

  getLabels(row: IDataRow) {
    const v = this.getValue(row);
    return v.map(({key, value}) => ({key, value: DEFAULT_FORMATTER(value)}));
  }

  getSortMethod() {
    return this.sort;
  }

  setSortMethod(sort: EAdvancedSortMethod) {
    if (this.sort === sort) {
      return;
    }
    this.fire([Column.EVENT_SORTMETHOD_CHANGED], this.sort, this.sort = sort);
    // sort by me if not already sorted by me
    if (!this.isSortedByMe().asc) {
      this.sortByMe();
    }
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.sortMethod = this.getSortMethod();
    r.filter = !isDummyNumberFilter(this.currentFilter) ? this.currentFilter : null;
    r.map = this.mapping.dump();
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (dump.sortMethod) {
      this.sort = dump.sortMethod;
    }
    if (dump.filter) {
      this.currentFilter = restoreFilter(dump.filter);
    }
    if (dump.map) {
      this.mapping = createMappingFunction(dump.map);
    } else if (dump.domain) {
      this.mapping = new ScaleMappingFunction(dump.domain, 'linear', dump.range || [0, 1]);
    }
  }

  protected createEventList() {
    return super.createEventList().concat([NumberMapColumn.EVENT_MAPPING_CHANGED]);
  }

  getOriginalMapping() {
    return this.original.clone();
  }

  getMapping() {
    return this.mapping.clone();
  }

  setMapping(mapping: IMappingFunction) {
    if (this.mapping.eq(mapping)) {
      return;
    }
    this.fire([NumberMapColumn.EVENT_MAPPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.mapping.clone(), this.mapping = mapping);
  }

  isFiltered() {
    return NumberColumn.prototype.isFiltered.call(this);
  }

  getFilter(): INumberFilter {
    return NumberColumn.prototype.getFilter.call(this);
  }

  setFilter(value: INumberFilter = {min: -Infinity, max: +Infinity, filterMissing: false}) {
    NumberColumn.prototype.setFilter.call(this, value);
  }

  filter(row: IDataRow) {
    return NumberColumn.prototype.filter.call(this, row);
  }
}

