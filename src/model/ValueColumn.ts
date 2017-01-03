/**
 * Created by sam on 04.11.2016.
 */
import Column, {IColumnDesc} from './Column';
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
   * @param index its data index
   * @param id the id of this column
   * @param desc the description of this column
   * @param ranking the ranking of this column
   */
  accessor(row: any, index: number, id: string, desc: any, ranking: Ranking): T;
}

/**
 * a column having an accessor to get the cell value
 */
export default class ValueColumn<T> extends Column {
  static readonly RENDERER_LOADING = 'loading';

  private readonly accessor: (row: any, index: number, id: string, desc: any, ranking: Ranking) => T;

  /**
   * is the data available
   * @type {boolean}
   */
  private loaded;

  constructor(id: string, desc: IValueColumnDesc<T>) {
    super(id, desc);
    //find accessor
    this.accessor = desc.accessor || (() => null);
    this.loaded = desc.lazyLoaded !== true;
  }

  getLabel(row: any, index: number) {
    if (!this.isLoaded()) {
      return '';
    }
    return '' + this.getValue(row, index);
  }

  getRaw(row: any, index: number) {
    if (!this.isLoaded()) {
      return null;
    }
    return this.accessor(row, index, this.id, this.desc, this.findMyRanker());
  }

  getValue(row: any, index: number) {
    return this.getRaw(row, index);
  }

  isLoaded() {
    return this.loaded;
  }

  setLoaded(loaded: boolean) {
    if (this.loaded === loaded) {
      return;
    }
    this.fire([Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.loaded, this.loaded = loaded);
  }

  getRendererType(): string {
    if (!this.isLoaded()) {
      return ValueColumn.RENDERER_LOADING;
    }
    return super.getRendererType();
  }
}
