/**
 * Created by sam on 04.11.2016.
 */

import {merge} from '../utils';
import DataProvider, {IDataRow}  from '../provider/ADataProvider';

export interface IRowFetcher {

}

export default class RowFetcher {

  private options: IRowFetcher = {};

  private cache = new Map<number, Promise<IDataRow>>();

  constructor(private provider: DataProvider, options: IRowFetcher = {}) {
    merge(this.options, options);
  }

  private select(orders: number[][]) {
    const union = new Set<number>();
    const union_add = union.add.bind(union);
    orders.forEach((order) => order.forEach(union_add));

    // removed cached
    this.cache.forEach((v,k) => union.delete(k));

    // const maxLength = Math.max(...orders.map((o) => o.length));
    var r = [];
    union.forEach(r.push.bind(r));
    return r;
  }

  private loadInCache(missing: number[]) {
    if (missing.length === 0) {
      return;
    }
    // load data and map to rows;
    const v = this.provider.view(missing);
    missing.forEach((m, i) => {
      const dataIndex = missing[i];
      this.cache.set(dataIndex, v.then((loaded) => ({v: loaded[i], dataIndex})));
    });
  }

  fetch(orders: number[][]): Promise<IDataRow>[][] {
    const toLoad = this.select(orders);
    this.loadInCache(toLoad);

    return orders.map((order) =>
      order.map((dataIndex) => this.cache.get(dataIndex)));
  }
}
