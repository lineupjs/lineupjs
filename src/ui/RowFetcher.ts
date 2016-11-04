/**
 * Created by sam on 04.11.2016.
 */

import {IDataRow} from '../renderer';
import DataProvider from '../provider/ADataProvider';


export default class RowFetcher {

  constructor(private provider: DataProvider) {

  }

  fetch(order: number[]): Promise<IDataRow>[] {
    const view = this.provider.view(order).then((data) => data.map((v, i) => ({v: v, dataIndex: order[i]})));
    return order.map((dataIndex, i) => view.then((rows) => rows[i]));
  }
}
