import Column from './Column';
import {range} from 'd3-array';
import {IDataRow} from './interfaces';
import {IMapColumn} from './MapColumn';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';


export interface IArrayDesc {
  readonly dataLength: number;
  readonly labels?: string[];
}

export interface ISplicer {
  length: number;

  splice<T>(values: T[]): T[];
}

export interface IArrayColumnDesc<T> extends IArrayDesc, IValueColumnDesc<T[]> {
  // dummy
}

export default class ArrayColumn<T> extends ValueColumn<T[]> implements IMapColumn<T> {
  static readonly EVENT_SPLICE_CHANGED = 'spliceChanged';

  protected readonly dataLength: number;

  private splicer: ISplicer;

  private readonly originalLabels: string[];

  constructor(id: string, desc: IArrayColumnDesc<T>) {
    super(id, desc);
    this.dataLength = desc.dataLength || 0;
    this.originalLabels = desc.labels || (range(this.dataLength).map((_d, i) => `Column ${i}`));
    this.splicer = {
      length: this.dataLength,
      splice: (v) => v
    };
  }

  setSplicer(splicer: ISplicer) {
    this.fire([ArrayColumn.EVENT_SPLICE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY], this.splicer, this.splicer = splicer);
  }

  get labels() {
    if (this.splicer) {
      return this.splicer.splice(this.originalLabels);
    }
    return this.originalLabels;
  }

  getSplicer() {
    return this.splicer;
  }

  getDataLength() {
    if (this.splicer) {
      return this.splicer.length;
    }
    return this.dataLength;
  }

  getValue(row: IDataRow) {
    let r = super.getValue(row);
    if (this.splicer && r !== null) {
      r = this.splicer.splice(r);
    }
    return r == null ? [] : r;
  }

  getLabels(row: IDataRow) {
    return this.getValue(row).map(String);
  }

  getLabel(row: IDataRow): string {
    const v = this.getLabels(row);
    if (!v) {
      return '';
    }
    return v.toString();
  }

  getMap(row: IDataRow) {
    const labels = this.labels;
    return this.getValue(row).map((value, i) => ({key: labels[i], value}));
  }

  getMapLabel(row: IDataRow) {
    const labels = this.labels;
    return this.getLabels(row).map((value, i) => ({key: labels[i], value}));
  }

  protected createEventList() {
    return super.createEventList().concat([ArrayColumn.EVENT_SPLICE_CHANGED]);
  }

}

