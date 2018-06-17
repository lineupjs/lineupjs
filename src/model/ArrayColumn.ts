import {Category} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import ValueColumn, {IValueColumnDesc, dataLoaded} from './ValueColumn';
import {range} from 'd3-array';
import {IArrayColumn} from './IArrayColumn';
import {IDataRow} from './interfaces';
import {IEventListener} from '../internal/AEventDispatcher';


export interface IArrayDesc {
  dataLength?: number;
  labels?: string[];
}

export interface ISplicer {
  length: number | null;

  splice<T>(values: T[]): T[];
}

export interface IArrayColumnDesc<T> extends IArrayDesc, IValueColumnDesc<T[]> {
  // dummy
}

/**
 * emitted when the splicer property changes
 * @asMemberOf ArrayColumn
 * @event
 */
export declare function spliceChanged(previous: ISplicer, current: ISplicer): void;


@Category('array')
export default class ArrayColumn<T> extends ValueColumn<T[]> implements IArrayColumn<T> {
  static readonly EVENT_SPLICE_CHANGED = 'spliceChanged';

  private readonly _dataLength: number | null;

  private splicer: Readonly<ISplicer>;

  private readonly originalLabels: string[];

  constructor(id: string, desc: Readonly<IArrayColumnDesc<T>>) {
    super(id, desc);
    this._dataLength = desc.dataLength == null || isNaN(desc.dataLength) ? null : desc.dataLength;
    this.originalLabels = desc.labels || (range(this._dataLength == null ? 0 : this._dataLength).map((_d, i) => `Column ${i}`));
    this.splicer = {
      length: this._dataLength,
      splice: (v) => v
    };
  }

  setSplicer(splicer: Readonly<ISplicer>) {
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

  get dataLength() {
    if (this.splicer) {
      return this.splicer.length;
    }
    return this._dataLength;
  }

  getValue(row: IDataRow) {
    return this.getValues(row);
  }

  getValues(row: IDataRow) {
    let r = super.getValue(row);
    if (this.splicer && r != null) {
      r = this.splicer.splice(r);
    }
    return r == null ? [] : r;
  }

  getLabels(row: IDataRow) {
    return this.getValues(row).map(String);
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
    return this.getValues(row).map((value, i) => ({key: labels[i], value}));
  }

  getMapLabel(row: IDataRow) {
    const labels = this.labels;
    return this.getLabels(row).map((value, i) => ({key: labels[i], value}));
  }

  protected createEventList() {
    return super.createEventList().concat([ArrayColumn.EVENT_SPLICE_CHANGED]);
  }

  on(type: typeof ArrayColumn.EVENT_SPLICE_CHANGED, listener: typeof spliceChanged | null): this;
  on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
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
    return super.on(<any>type, listener);
  }

}

