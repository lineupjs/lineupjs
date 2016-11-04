/**
 * Created by sam on 04.11.2016.
 */

import {merge} from '../utils';
import {IDataRow} from '../renderer';
import DataProvider from '../provider/ADataProvider';

export interface IRowFetcher {

}

export default class RowFetcher {

  private options: IRowFetcher = {};

  constructor(private provider: DataProvider, options: IRowFetcher = {}) {
    merge(this.options, options);
  }

  fetch(orders: number[][]): Promise<IDataRow>[][] {
    const union = new Set<number>();
    const union_add = union.add.bind(union);
    orders.forEach((order) => order.forEach(union_add));
    const toLoad = [];
    union.forEach(toLoad.push.bind(toLoad));
    const lookup = new Map<number, number>();
    toLoad.forEach((dataIndex, i) => lookup.set(dataIndex, i));

    // load data and map to rows;
    const data = this.provider.view(toLoad).then((loaded) =>
      loaded.map((l, i) => ({v: l, dataIndex: toLoad[i]})));


    return orders.map((order) =>
      order.map((dataIndex) =>
        data.then((loaded) =>
          loaded[lookup.get(dataIndex)])));
  }
}
