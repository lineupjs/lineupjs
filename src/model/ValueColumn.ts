/**
 * Created by sam on 04.11.2016.
 */
import Column from './Column';
import Ranking from './Ranking';

/**
 * a column having an accessor to get the cell value
 */
export default class ValueColumn<T> extends Column {
  protected accessor: (row: any, id: string, desc: any, ranking: Ranking) => T;

  constructor(id: string, desc: any) {
    super(id, desc);
    //find accessor
    this.accessor = desc.accessor || (() => null);
  }

  getLabel(row: any) {
    return '' + this.getValue(row);
  }

  getRaw(row: any) {
    return this.accessor(row, this.id, this.desc, this.findMyRanker());
  }

  getValue(row: any) {
    return this.getRaw(row);
  }

  compare(a: any, b: any) {
    return 0; //can't compare
  }
}
