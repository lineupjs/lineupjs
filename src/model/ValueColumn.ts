import Column from './Column';
import {IColumnDesc, IDataRow} from './interfaces';
import Ranking from './Ranking';


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
 * a column having an accessor to get the cell value
 */
export default class ValueColumn<T> extends Column {
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
    this.fire([Column.EVENT_DATA_LOADED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.loaded, this.loaded = loaded);
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
