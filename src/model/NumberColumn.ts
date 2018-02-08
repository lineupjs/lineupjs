import {format} from 'd3-format';
import {equalArrays} from '../internal';
import {Category, toolbar} from './annotations';
import Column from './Column';
import {IDataRow, IGroup, IGroupData} from './interfaces';
import {groupCompare, isDummyNumberFilter, restoreFilter} from './internal';
import {
  default as INumberColumn, EAdvancedSortMethod, INumberDesc, INumberFilter, isEqualNumberFilter,
  isNumberIncluded, noNumberFilter, numberCompare
} from './INumberColumn';
import {
  createMappingFunction, IMapAbleColumn, IMappingFunction, restoreMapping,
  ScaleMappingFunction
} from './MappingFunction';
import {isMissingValue, isUnknown, missingGroup} from './missing';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';

export {default as INumberColumn, isNumberColumn} from './INumberColumn';


export declare type INumberColumnDesc = INumberDesc & IValueColumnDesc<number>;


/**
 * a number column mapped from an original input scale to an output range
 */
@toolbar('stratifyThreshold', 'sortNumbersGroup', 'filterMapped')
@Category('number')
export default class NumberColumn extends ValueColumn<number> implements INumberColumn, IMapAbleColumn {
  static readonly EVENT_MAPPING_CHANGED = 'mappingChanged';

  private readonly missingValue: number;

  private mapping: IMappingFunction;
  private original: IMappingFunction;

  /**
   * currently active filter
   * @type {{min: number, max: number}}
   * @private
   */
  private currentFilter: INumberFilter = noNumberFilter();

  private numberFormat: (n: number) => string = format('.2f');

  private currentStratifyThresholds: number[] = [];
  private groupSortMethod: EAdvancedSortMethod = EAdvancedSortMethod.median;

  constructor(id: string, desc: INumberColumnDesc) {
    super(id, desc);

    this.mapping = restoreMapping(desc);
    this.original = this.mapping.clone();

    if (desc.numberFormat) {
      this.numberFormat = format(desc.numberFormat);
    }
    this.missingValue = desc.missingValue != null ? desc.missingValue : NaN;

    this.setGroupRenderer('boxplot');
    this.setDefaultSummaryRenderer('histogram');
  }

  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.map = this.mapping.dump();
    r.filter = isDummyNumberFilter(this.currentFilter) ? null : this.currentFilter;
    r.groupSortMethod = this.groupSortMethod;
    if (this.currentStratifyThresholds) {
      r.stratifyThreshholds = this.currentStratifyThresholds;
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (dump.map) {
      this.mapping = createMappingFunction(dump.map);
    } else if (dump.domain) {
      this.mapping = new ScaleMappingFunction(dump.domain, 'linear', dump.range || [0, 1]);
    }
    if (dump.groupSortMethod) {
      this.groupSortMethod = dump.groupSortMethod;
    }
    if (dump.filter) {
      this.currentFilter = restoreFilter(dump.filter);
    }
    if (dump.stratifyThreshholds) {
      this.currentStratifyThresholds = dump.stratifyThresholds;
    }
    if (dump.numberFormat) {
      this.numberFormat = format(dump.numberFormat);
    }
  }

  protected createEventList() {
    return super.createEventList().concat([NumberColumn.EVENT_MAPPING_CHANGED]);
  }

  getLabel(row: IDataRow) {
    if ((<any>this.desc).numberFormat) {
      const raw = this.getRawValue(row);
      //if a dedicated format and a number use the formatter in any case
      if (isNaN(raw)) {
        return 'NaN';
      }
      if (!isFinite(raw)) {
        return raw.toString();
      }
      return this.numberFormat(raw);
    }
    const v = super.getValue(row);
    //keep non number if it is not a number else convert using formatter
    if (typeof v === 'number') {
      return this.numberFormat(+v);
    }
    return String(v);
  }

  getRange() {
    return this.mapping.getRange(this.numberFormat);
  }

  getRawValue(row: IDataRow, missingValue = this.missingValue) {
    const v: any = super.getValue(row);
    if (isMissingValue(v)) {
      return missingValue;
    }
    return +v;
  }

  isMissing(row: IDataRow) {
    return isMissingValue(super.getValue(row));
  }

  getValue(row: IDataRow) {
    const v = this.getRawValue(row);
    if (isNaN(v)) {
      return v;
    }
    return this.mapping.apply(v);
  }

  getNumber(row: IDataRow) {
    return this.getValue(row);
  }

  getRawNumber(row: IDataRow, missingValue = this.missingValue) {
    return this.getRawValue(row, missingValue);
  }

  compare(a: IDataRow, b: IDataRow) {
    return numberCompare(this.getNumber(a), this.getNumber(b), this.isMissing(a), this.isMissing(b));
  }

  groupCompare(a: IGroupData, b: IGroupData): number {
    return groupCompare(a.rows, b.rows, this, <any>this.groupSortMethod);
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
    this.fire([NumberColumn.EVENT_MAPPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.mapping.clone(), this.mapping = mapping);
  }

  isFiltered() {
    return !isDummyNumberFilter(this.currentFilter);
  }

  getFilter(): INumberFilter {
    return Object.assign({}, this.currentFilter);
  }

  setFilter(value: INumberFilter = {min: -Infinity, max: +Infinity, filterMissing: false}) {
    if (isEqualNumberFilter(value, this.currentFilter)) {
      return;
    }
    const bak = this.getFilter();
    this.currentFilter.min = isUnknown(value.min) ? -Infinity : value.min;
    this.currentFilter.max = isUnknown(value.max) ? Infinity : value.max;
    this.currentFilter.filterMissing = value.filterMissing;
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getFilter());
  }

  /**
   * filter the current row if any filter is set
   * @param row
   * @returns {boolean}
   */
  filter(row: IDataRow) {
    return isNumberIncluded(this.currentFilter, this.getRawNumber(row, NaN));
  }

  getStratifyThresholds() {
    return this.currentStratifyThresholds.slice();
  }

  setStratifyThresholds(value: number[]) {
    if (equalArrays(this.currentStratifyThresholds, value)) {
      return;
    }
    const bak = this.getStratifyThresholds();
    this.currentStratifyThresholds = value.slice();
    this.fire([Column.EVENT_GROUPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, value);
  }


  group(row: IDataRow): IGroup {
    if (this.currentStratifyThresholds.length === 0) {
      return super.group(row);
    }
    if (this.isMissing(row)) {
      return missingGroup;
    }
    const value = this.getRawNumber(row);
    const treshholdIndex = this.currentStratifyThresholds.findIndex((t) => value <= t);
    // group by thresholds / bins
    switch (treshholdIndex) {
      case -1:
        //bigger than the last threshold
        return {
          name: `${this.label} > ${this.currentStratifyThresholds[this.currentStratifyThresholds.length - 1]}`,
          color: 'gray'
        };
      case 0:
        //smallest
        return {name: `${this.label} <= ${this.currentStratifyThresholds[0]}`, color: 'gray'};
      default:
        return {
          name: `${this.currentStratifyThresholds[treshholdIndex - 1]} <= ${this.label} <= ${this.currentStratifyThresholds[treshholdIndex]}`,
          color: 'gray'
        };
    }
  }

  getSortMethod() {
    return this.groupSortMethod;
  }

  setSortMethod(sortMethod: EAdvancedSortMethod) {
    if (this.groupSortMethod === sortMethod) {
      return;
    }
    this.fire([Column.EVENT_SORTMETHOD_CHANGED], this.groupSortMethod, this.groupSortMethod = sortMethod);
    // sort by me if not already sorted by me
    if (!this.isGroupSortedByMe().asc) {
      this.toggleMyGroupSorting();
    }
  }
}
