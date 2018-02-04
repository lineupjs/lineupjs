import {ILineUpLike} from '../interfaces';
import AEventDispatcher from '../internal/AEventDispatcher';
import Column from '../model/Column';
import DataProvider from '../provider/ADataProvider';

export abstract class ALineUp extends AEventDispatcher implements ILineUpLike {
  /**
   * triggered when the mouse is over a specific row
   * @argument data_index:number the selected data index or <0 if no row
   */
  static readonly EVENT_HOVER_CHANGED = 'hoverChanged';

  /**
   * triggered when the user click on a row
   * @argument data_index:number the selected data index or <0 if no row
   */
  static readonly EVENT_SELECTION_CHANGED = DataProvider.EVENT_SELECTION_CHANGED;

  constructor(public readonly node: HTMLElement, public data: DataProvider) {
    super();

    this.forward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.main`);
  }

  protected createEventList() {
    return super.createEventList().concat([ALineUp.EVENT_HOVER_CHANGED, ALineUp.EVENT_SELECTION_CHANGED]);
  }

  destroy() {
    this.node.remove();
  }

  dump() {
    return this.data.dump();
  }

  abstract update(): void;

  setDataProvider(data: DataProvider, dump?: any) {
    if (this.data) {
      this.unforward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.taggle`);
    }
    this.data = data;
    if (dump) {
      this.data.restore(dump);
    }
    this.forward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.taggle`);
  }

  /**
   * sorts LineUp by he given column
   * @param column callback function finding the column to sort
   * @param ascending
   * @returns {boolean}
   */
  sortBy(column: string | ((col: Column) => boolean), ascending = false) {
    const col = this.data.find(column);
    if (col) {
      col.sortByMe(ascending);
    }
    return col != null;
  }

  abstract fakeHover(dataIndex: number, scrollIntoView: boolean): boolean;

}

export default ALineUp;
