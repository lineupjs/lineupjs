import {median, quantile} from 'd3-array';
import {toolbar} from './annotations';
import Column from './Column';
import CompositeNumberColumn, {ICompositeNumberColumnDesc} from './CompositeNumberColumn';
import {IDataRow} from './interfaces';
import {EAdvancedSortMethod} from './INumberColumn';

/**
 *  factory for creating a description creating a max column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createReduceDesc(label: string = 'Reduce') {
  return {type: 'reduce', label};
}

export interface IReduceDesc {
  readonly reduce?: EAdvancedSortMethod;
}


export declare type IReduceColumnDesc = IReduceDesc & ICompositeNumberColumnDesc;

/**
 * combines multiple columns by using the maximal value
 */
@toolbar('reduce')
export default class ReduceColumn extends CompositeNumberColumn {
  static readonly EVENT_REDUCE_CHANGED = 'reduceChanged';

  private reduce: EAdvancedSortMethod;

  constructor(id: string, desc: Readonly<IReduceColumnDesc>) {
    super(id, desc);
    this.reduce = desc.reduce || EAdvancedSortMethod.max;
    this.setDefaultRenderer('interleaving');
    this.setDefaultGroupRenderer('interleaving');
    this.setDefaultSummaryRenderer('interleaving');
  }

  get label() {
    const l = super.getMetaData().label;
    if (l !== 'Reduce') {
      return l;
    }
    return `${this.reduce[0].toUpperCase()}${this.reduce.slice(1)}(${this.children.map((d) => d.label).join(', ')})`;
  }

  getColor(row: IDataRow) {
    //compute the index of the maximal one
    const c = this._children;
    if (c.length === 0 || this.reduce === EAdvancedSortMethod.q1 || this.reduce === EAdvancedSortMethod.q3 || this.reduce === EAdvancedSortMethod.mean) {
      return this.color;
    }
    const v = this.compute(row);
    const selected = c.find((c) => c.getValue(row) === v);
    return selected ? selected.color : this.color;
  }

  protected compute(row: IDataRow) {
    const vs = this._children.map((d) => d.getValue(row)).filter((d) => !isNaN(d));
    if (vs.length === 0) {
      return NaN;
    }
    switch (this.reduce) {
      case EAdvancedSortMethod.mean:
        return vs.reduce((a, b) => a + b, 0) / vs.length;
      case EAdvancedSortMethod.max:
        return Math.max(...vs);
      case EAdvancedSortMethod.min:
        return Math.min(...vs);
      case EAdvancedSortMethod.median:
        return median(vs)!;
      case EAdvancedSortMethod.q1:
        return quantile(vs.sort((a, b) => a - b), 0.25)!;
      case EAdvancedSortMethod.q3:
        return quantile(vs.sort((a, b) => a - b), 0.75)!;
    }
  }

  protected createEventList() {
    return super.createEventList().concat([ReduceColumn.EVENT_REDUCE_CHANGED]);
  }

  getReduce() {
    return this.reduce;
  }

  setReduce(reduce: EAdvancedSortMethod) {
    if (this.reduce === reduce) {
      return;
    }
    this.fire([ReduceColumn.EVENT_REDUCE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.reduce, this.reduce = reduce);
  }

  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.reduce = this.reduce;
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    this.reduce = dump.reduce || this.reduce;
    super.restore(dump, factory);
  }

  get canJustAddNumbers() {
    return true;
  }
}
