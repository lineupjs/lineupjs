/**
 * Created by sam on 04.11.2016.
 */
import Column from './Column';
import Ranking from './Ranking';

/**
 * a column having an accessor to get the cell value
 */
export default class ValueColumn<T> extends Column {
  static readonly RENDERER_LOADING = 'loading';

  private readonly accessor: (row: any, number: number, id: string, desc: any, ranking: Ranking) => T;

  /**
   * is the data available
   * @type {boolean}
   */
  private loaded;

  constructor(id: string, desc: any) {
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

  rendererType(): string {
    if (!this.isLoaded()) {
      return ValueColumn.RENDERER_LOADING;
    }
    return super.rendererType();
  }
}
