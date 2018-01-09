import Column, {IColumnDesc, IDataRow} from '../model';
import {defaultGroup, IOrderedGroup} from '../model/Group';
import Ranking from '../model/Ranking';
import ACommonDataProvider from './ACommonDataProvider';
import {IDataProviderOptions, IStatsBuilder} from './ADataProvider';

/**
 * interface what the server side has to provide
 */
export interface IServerData {
  /**
   * sort the dataset by the given description
   * @param ranking
   */
  sort(ranking: Ranking): Promise<number[]>;

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
  search(search: string | RegExp, column: any): Promise<number[]>;

  stats(indices: number[]): IStatsBuilder;
}


export interface IRemoteDataProviderOptions {
  /**
   * maximal cache size (unused at the moment)
   */
  maxCacheSize: number;
}

/**
 * a remote implementation of the data provider
 */
export default class RemoteDataProvider extends ACommonDataProvider {
  private readonly options: IRemoteDataProviderOptions = {
    maxCacheSize: 1000
  };

  private readonly cache = new Map<number, Promise<IDataRow>>();


  constructor(private server: IServerData, columns: IColumnDesc[] = [], options: Partial<IRemoteDataProviderOptions & IDataProviderOptions> = {}) {
    super(columns, options);
    Object.assign(this.options, options);
  }

  getTotalNumberOfRows() {
    // TODO not correct
    return this.cache.size;
  }

  sortImpl(ranking: Ranking): Promise<IOrderedGroup[]> {
    //use the server side to sort
    return this.server.sort(ranking).then((order) => [Object.assign({order}, defaultGroup)]);
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
    this.cache.forEach((_v, k) => union.delete(k));

    if ((this.cache.size + union.size) > this.options.maxCacheSize) {
      // clean up cache
    }
    // const maxLength = Math.max(...orders.map((o) => o.length));
    return Array.from(union);
  }

  private loadInCache(missing: number[]) {
    if (missing.length === 0) {
      return;
    }
    // load data and map to rows;
    const v = this.loadFromServer(missing);
    missing.forEach((_m, i) => {
      const dataIndex = missing[i];
      this.cache.set(dataIndex, v.then((loaded) => ({v: loaded[i], i: dataIndex})));
    });
  }

  fetch(orders: number[][]): Promise<IDataRow>[][] {
    const toLoad = this.computeMissing(orders);
    this.loadInCache(toLoad);

    return orders.map((order) =>
      order.map((i) => this.cache.get(i)!));
  }


  mappingSample(col: Column): Promise<number[]> {
    return this.server.mappingSample((<any>col.desc).column);
  }

  searchAndJump(search: string | RegExp, col: Column) {
    this.server.search(search, (<any>col.desc).column).then((indices) => {
      this.jumpToNearest(indices);
    });
  }

  stats(indices: number[]) {
    return this.server.stats(indices);
  }
}
