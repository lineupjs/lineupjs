import {Category, toolbar} from './annotations';
import CategoricalColumn from './CategoricalColumn';
import Column from './Column';
import {ICategoricalColumn, ICategory} from './ICategoricalColumn';
import {IDataRow} from './interfaces';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';

export interface IBooleanDesc {
  /**
   * string to show for true
   * @default ✓
   */
  trueMarker?: string;
  /**
   * strint to show for false
   * @default (empty)
   */
  falseMarker?: string;
}

export declare type IBooleanColumnDesc = IValueColumnDesc<boolean> & IBooleanDesc;

/**
 * a string column with optional alignment
 */
@toolbar('stratify', 'filterBoolean')
@Category('categorical')
export default class BooleanColumn extends ValueColumn<boolean> implements ICategoricalColumn {
  static readonly GROUP_TRUE = {name: 'True', color: 'black'};
  static readonly GROUP_FALSE = {name: 'False', color: 'white'};

  private currentFilter: boolean | null = null;
  readonly categories: ICategory[];

  constructor(id: string, desc: Readonly<IBooleanColumnDesc>) {
    super(id, desc);
    this.setWidthImpl(30);
    this.categories = [
      {
        name: desc.trueMarker || '✓',
        color: BooleanColumn.GROUP_TRUE.color,
        label: BooleanColumn.GROUP_TRUE.name,
        value: 0
      },
      {
        name: desc.trueMarker || '',
        color: BooleanColumn.GROUP_FALSE.color,
        label: BooleanColumn.GROUP_FALSE.name,
        value: 1
      }
    ];
  }

  get dataLength() {
    return this.categories.length;
  }

  get labels() {
    return this.categories.map((d) => d.label);
  }

  getValue(row: IDataRow) {
    const v: any = super.getValue(row);
    if (typeof(v) === 'undefined' || v == null) {
      return false;
    }
    return v === true || v === 'true' || v === 'yes' || v === 'x';
  }

  isMissing() {
    return false;
  }

  getCategory(row: IDataRow) {
    const v = this.getValue(row);
    return this.categories[v ? 0 : 1];
  }

  getLabel(row: IDataRow) {
    return CategoricalColumn.prototype.getLabel.call(this, row);
  }

  getLabels(row: IDataRow) {
    return CategoricalColumn.prototype.getLabels.call(this, row);
  }

  getValues(row: IDataRow) {
    return CategoricalColumn.prototype.getValues.call(this, row);
  }

  getMap(row: IDataRow) {
    return CategoricalColumn.prototype.getMap.call(this, row);
  }

  getMapLabel(row: IDataRow) {
    return CategoricalColumn.prototype.getMapLabel.call(this, row);
  }

  getSet(row: IDataRow) {
    const v = this.getValue(row);
    const r = new Set<ICategory>();
    r.add(this.categories[v ? 0 : 1]);
    return r;
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    if (this.currentFilter != null) {
      r.filter = this.currentFilter;
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (typeof dump.filter !== 'undefined') {
      this.currentFilter = dump.filter;
    }
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row: IDataRow) {
    if (!this.isFiltered()) {
      return true;
    }
    const r = this.getValue(row);
    return r === this.currentFilter;
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter: boolean | null) {
    if (this.currentFilter === filter) {
      return;
    }
    this.fire([Column.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.currentFilter, this.currentFilter = filter);
  }

  compare(a: IDataRow, b: IDataRow) {
    const av = this.getValue(a);
    const bv = this.getValue(b);
    return av === bv ? 0 : (av < bv ? -1 : +1);
  }

  group(row: IDataRow) {
    const enabled = this.getValue(row);
    return enabled ? BooleanColumn.GROUP_TRUE : BooleanColumn.GROUP_FALSE;
  }
}
