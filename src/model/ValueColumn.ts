import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import {IColumnDesc, IDataRow} from './interfaces';
import Ranking from './Ranking';
import {IEventListener} from '../internal/AEventDispatcher';


export interface IValueColumnDesc<T> extends IColumnDesc {
  /**
   * is the data lazy loaded and not yet available
   * @default false
   */
  lazyLoaded?: boolean;

  /**
   * value accessor of this column
   * @param row the current row
   * @param id the id of this column
   * @param desc the description of this column
   * @param ranking the ranking of this column
   */
  accessor?(row: IDataRow, id: string, desc: any, ranking: Ranking | null): T;
}

/**
 * emitted when the data of this column has been loaded
 * @asMemberOf ValueColumn
 * @event
 */
export declare function dataLoaded(previous: boolean, current: boolean): void;

/**
 * a column having an accessor to get the cell value
 */
export default class ValueColumn<T> extends Column {
  static readonly EVENT_DATA_LOADED = 'dataLoaded';

  static readonly RENDERER_LOADING = 'loading';

  private readonly accessor: (row: IDataRow, id: string, desc: any, ranking: Ranking | null) => T;

  /**
   * is the data available
   * @type {boolean}
   */
  private loaded: boolean;

  constructor(id: string, desc: Readonly<IValueColumnDesc<T>>) {
    super(id, desc);
    //find accessor
    this.accessor = desc.accessor! || (() => null);
    this.loaded = desc.lazyLoaded !== true;
  }

  protected createEventList() {
    return super.createEventList().concat([ValueColumn.EVENT_DATA_LOADED]);
  }

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


  getLabel(row: IDataRow) {
    if (!this.isLoaded()) {
      return '';
    }
    return String(this.getValue(row));
  }

  getRaw(row: IDataRow) {
    if (!this.isLoaded()) {
      return null;
    }
    return this.accessor(row, this.id, this.desc, this.findMyRanker());
  }

  getValue(row: IDataRow) {
    return this.getRaw(row);
  }

  isLoaded() {
    return this.loaded;
  }

  setLoaded(loaded: boolean) {
    if (this.loaded === loaded) {
      return;
    }
    this.fire([ValueColumn.EVENT_DATA_LOADED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.loaded, this.loaded = loaded);
  }

  getRenderer(): string {
    if (!this.isLoaded()) {
      return ValueColumn.RENDERER_LOADING;
    }
    return super.getRenderer();
  }

  /**
   * patch the dump such that the loaded attribute is defined (for lazy loading columns)
   * @param toDescRef
   * @returns {any}
   */
  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.loaded = this.loaded;

    if (!this.loaded && r.rendererType === ValueColumn.RENDERER_LOADING) {
      delete r.rendererType;
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    if (dump.loaded !== undefined) {
      this.loaded = dump.loaded;
    }
    super.restore(dump, factory);
  }
}
