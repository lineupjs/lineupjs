/**
 * Created by sam on 04.11.2016.
 */

import {merge} from '../utils';
import Column, {IColumnDesc} from '../model/Column';
import Ranking from '../model/Ranking';
import {IStatsBuilder, IDataRow, IDataProviderOptions} from './ADataProvider';
import ACommonDataProvider from './ACommonDataProvider';

/**
 * interface what the server side has to provide
 */
export interface IServerData {
  /**
   * sort the dataset by the given description
   * @param desc
   */
  sort(desc: any): Promise<number[]>;
  /**
   * returns a slice of the data array identified by a list of indices
   * @param indices
   */
  view(indices: number[]): Promise<any[]>;
  /**
   * returns a sample of the values for a given column
   * @param column
   */
  mappingSample(column: any): Promise<number[]>;
  /**
   * return the matching indices matching the given arguments
   * @param search
   * @param column
   */
  search(search: string|RegExp, column: any): Promise<number[]>;

  stats(indices: number[]): IStatsBuilder;
}


export interface IRemoteDataProviderOptions {
  /**
   * maximal cache size (unused at the moment)
   */
  maxCacheSize?: number;
}

/**
 * a remote implementation of the data provider
 */
export default class RemoteDataProvider extends ACommonDataProvider {
  private readonly options: IRemoteDataProviderOptions = {
    maxCacheSize: 1000
  };

  private readonly cache = new Map<number, Promise<IDataRow>>();


  constructor(private server: IServerData, columns: IColumnDesc[] = [], options: IRemoteDataProviderOptions & IDataProviderOptions = {}) {
    super(columns, options);
    merge(this.options, options);
  }

  sortImpl(ranking: Ranking): Promise<number[]> {
    //generate a description of what to sort
    const desc = ranking.toSortingDesc((desc) => desc.column);
    //use the server side to sort
    return this.server.sort(desc);
  }

  private loadFromServer(indices: number[]) {
    return this.server.view(indices).then((view) => {
      //enhance with the data index
      return view.map((v, i) => {
        const dataIndex = indices[i];
        return {v, dataIndex};
      });
    });
  }

  view(indices: number[]): Promise<any[]> {
    if (indices.length === 0) {
      return Promise.resolve([]);
    }
    const base = this.fetch([indices])[0];
    return Promise.all(base).then((rows) => rows.map((d) => d.v));
  }


  private computeMissing(orders: number[][]): number[] {
    const union = new Set<number>();
    const unionAdd = union.add.bind(union);
    orders.forEach((order) => order.forEach(unionAdd));

    // removed cached
    this.cache.forEach((v, k) => union.delete(k));

    if ((this.cache.size + union.size) > this.options.maxCacheSize) {
      // clean up cache
    }
    // const maxLength = Math.max(...orders.map((o) => o.length));
    const r = [];
    union.forEach(r.push.bind(r));
    return r;
  }

  private loadInCache(missing: number[]) {
    if (missing.length === 0) {
      return;
    }
    // load data and map to rows;
    const v = this.loadFromServer(missing);
    missing.forEach((m, i) => {
      const dataIndex = missing[i];
      this.cache.set(dataIndex, v.then((loaded) => ({v: loaded[i], dataIndex})));
    });
  }

  fetch(orders: number[][]): Promise<IDataRow>[][] {
    const toLoad = this.computeMissing(orders);
    this.loadInCache(toLoad);

    return orders.map((order) =>
      order.map((dataIndex) => this.cache.get(dataIndex)));
  }


  mappingSample(col: Column): Promise<number[]> {
    return this.server.mappingSample((<any>col.desc).column);
  }

  searchAndJump(search: string|RegExp, col: Column) {
    this.server.search(search, (<any>col.desc).column).then((indices) => {
      this.jumpToNearest(indices);
    });
  }

  stats(indices: number[]) {
    return this.server.stats(indices);
  }
}
