/**
 * Created by sam on 04.11.2016.
 */
import Column from './Column';
import Ranking from './Ranking';

/**
 * a column having an accessor to get the cell value
 */
export default class ValueColumn<T> extends Column {
  protected accessor: (row: any, number: number, id: string, desc: any, ranking: Ranking) => T;

  constructor(id: string, desc: any) {
    super(id, desc);
    //find accessor
    this.accessor = desc.accessor || (() => null);
  }

  getLabel(row: any, index: number) {
    return '' + this.getValue(row, index);
  }

  getRaw(row: any, index: number) {
    return this.accessor(row, index, this.id, this.desc, this.findMyRanker());
  }

  getValue(row: any, index: number) {
    return this.getRaw(row, index);
  }
}
