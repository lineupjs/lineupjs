/**
 * Created by bikramkawan on 24/11/2016.
 */
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import Column from './Column';
import {format} from 'd3';

export const SORT_METHOD = {
  min: 'min',
  max: 'max',
  median: 'median',
  q1: 'q1',
  q3: 'q3'
};

// till it can be more specific
export declare type SortMethod = string;


export interface IBoxPlotColumn {
  getBoxPlotData(row: any, index: number): IBoxPlotData;
  getDomain(): number[];
  getSortMethod(): string;
  setSortMethod(sortMethod: string);
}

export interface IBoxPlotColumnDesc extends IValueColumnDesc<IBoxPlotData> {
  readonly domain?: number[];
  readonly sort?: string;
}

export interface IBoxPlotData {
  readonly min: number;
  readonly max: number;
  readonly median: number;
  readonly q1: number;
  readonly q3: number;
}


export function compareBoxPlot(col: IBoxPlotColumn, a: any, b: any, aIndex: number, bIndex: number) {
  const aVal = (col.getBoxPlotData(a, aIndex));
  const bVal = (col.getBoxPlotData(b, bIndex));
  if (aVal === null) {
    return bVal === null ? 0 : +1;
  }
  if (bVal === null) {
    return -1;
  }
  const method = col.getSortMethod();
  return aVal[method] - bVal[method];
}


export default class BoxPlotColumn extends ValueColumn<IBoxPlotData> implements IBoxPlotColumn {
  private readonly domain;
  private sort: SortMethod;

  static readonly DEFAULT_FORMATTER = format('.3n');

  constructor(id: string, desc: IBoxPlotColumnDesc) {
    super(id, desc);
    this.domain = desc.domain || [0, 100];
    this.sort = desc.sort || SORT_METHOD.min;

  }

  compare(a: any, b: any, aIndex: number, bIndex: number): number {
    return compareBoxPlot(this, a, b, aIndex, bIndex);
  }

  getDomain() {
    return this.domain;
  }

  getBoxPlotData(row: any, index: number): IBoxPlotData {
    return this.getValue(row, index);
  }

  getLabel(row: any, index: number): string {
    const v = this.getValue(row, index);
    if (v === null) {
      return '';
    }
    const f = BoxPlotColumn.DEFAULT_FORMATTER;
    return `BoxPlot(min = ${f(v.min)}, q1 = ${f(v.q1)}, median = ${f(v.median)}, q3 = ${f(v.q3)}, max = ${f(v.max)})`;
  }

  getSortMethod() {
    return this.sort;
  }

  setSortMethod(sort: string) {
    if (this.sort === sort) {
      return;
    }
    this.fire([Column.EVENT_SORTMETHOD_CHANGED], this.sort, this.sort = sort);
    // sort by me if not already sorted by me
    if (this.findMyRanker().getSortCriteria().col !== this) {
      this.sortByMe();
    }
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.sortMethod = this.getSortMethod();
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column) {
    super.restore(dump, factory);
    if (dump.sortMethod) {
      this.sort = dump.sortMethod;
    }
  }
}

