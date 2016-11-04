/**
 * Created by sam on 04.11.2016.
 */

import {IColumnDesc} from '../model';
import DataProvider from './DataProvider';

/**
 * common base implementation of a DataProvider with a fixed list of column descriptions
 */
abstract class CommonDataProvider extends DataProvider {
  private rankingIndex = 0;
  //generic accessor of the data item
  private rowGetter = (row: any, id: string, desc: any) => row[desc.column];

  constructor(private columns: IColumnDesc[] = [], options: any = {}) {
    super(options);
    //generate the accessor
    columns.forEach((d: any) => {
      d.accessor = d.accessor || this.rowGetter;
      d.label = d.label || d.column;
    });
  }

  createEventList() {
    return super.createEventList().concat(['addDesc']);
  }

  /**
   * adds another column description to this data provider
   * @param column
   */
  pushDesc(column: IColumnDesc) {
    var d: any = column;
    d.accessor = d.accessor || this.rowGetter;
    d.label = column.label || d.column;
    this.columns.push(column);
    this.fire('addDesc', d);
  }

  getColumns(): IColumnDesc[] {
    return this.columns.slice();
  }

  findDesc(ref: string) {
    return this.columns.filter((c) => (<any>c).column === ref)[0];
  }

  /**
   * identify by the tuple type@columnname
   * @param desc
   * @returns {string}
   */
  toDescRef(desc: any): any {
    return desc.column ? desc.type + '@' + desc.column : desc;
  }

  fromDescRef(descRef: any): any {
    if (typeof(descRef) === 'string') {
      return this.columns.filter((d: any) => d.type + '@' + d.column === descRef) [0];
    }
    return descRef;
  }

  restore(dump: any) {
    super.restore(dump);
    this.rankingIndex = 1 + Math.max(...this.getRankings().map((r) => +r.id.substring(4)));
  }

  nextRankingId() {
    return 'rank' + (this.rankingIndex++);
  }
}

export default CommonDataProvider;
