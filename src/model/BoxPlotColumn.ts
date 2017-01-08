/**
 * Created by bikramkawan on 24/11/2016.
 */
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import Column from './Column';

export const SORT_METHOD = {
  min: 'min',
  max: 'max',
  median: 'median',
  q1: 'q1',
  q3: 'q3',
  mean: 'mean'
};
// till it can be more spcific
export declare type SortMethod = string;


export interface IBoxPlotColumn {
  getBoxPlotData(row: any, index: number): IBoxPlotData;
  getDomain(): number[];
  getSortMethod(): string;
  setSortMethod(sortMethod: string);
}


export interface IBoxPlotColumnDesc extends IValueColumnDesc<IBoxPlotData> {
  readonly domain?: number [];
  readonly sort?: string;
}

export  interface IBoxPlotData {
  readonly min: number;
  readonly max: number;
  readonly median: number;
  readonly q1: number;
  readonly q3: number;
}


export default class BoxPlotColumn extends ValueColumn<IBoxPlotData> implements IBoxPlotColumn {
  private readonly domain;
  private sort: SortMethod;

  constructor(id: string, desc: IBoxPlotColumnDesc) {
    super(id, desc);
    this.domain = desc.domain || [0, 100];
    this.sort = desc.sort || SORT_METHOD.min;

  }


  compare(a: any, b: any, aIndex: number, bIndex: number): number {
    const aVal = (this.getValue(a, aIndex));
    const bVal = (this.getValue(b, bIndex));
    if (aVal === null) {
      return bVal === null ? 0 : +1;
    }
    if (bVal === null) {
      return -1;
    }
    return aVal[this.sort] - bVal[this.sort];
  }

  getDomain() {
    return this.domain;
  }

  getBoxPlotData(row: any, index: number): IBoxPlotData {
    return this.getValue(row, index);
  }

  getSortMethod() {
    return this.sort;
  }

  setSortMethod(sort: string) {
    if (this.sort === sort) {
      return;
    }
    this.fire([Column.EVENT_SORTMETHOD_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.sort, this.sort = sort);
    // sort by me if not already sorted by me
    if (this.findMyRanker().getSortCriteria().col !== this) {
      this.sortByMe();
    }
  }

}

