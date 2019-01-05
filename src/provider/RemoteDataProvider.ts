import Column, {IColumnDesc, IDataRow, Ranking, IndicesArray, IOrderedGroup, IColumnDump, INumberColumn} from '../model';
import ACommonDataProvider from './ACommonDataProvider';
import {IDataProviderOptions} from './interfaces';
import {mapIndices} from '../model/internal';
import {LRUCache} from '../internal';
import {IRenderTasks} from '../renderer';

export interface IServerRankingDump {
  filter: IColumnDump[];
  sortCriteria: {asc: boolean, col: IColumnDump}[];
  groupCriteria: IColumnDump[];
  groupSortCriteria: {asc: boolean, col: IColumnDump}[];
}
/**
 * interface what the server side has to provide
 */
export interface IServerData {
  totalNumberOfRows: number;

  /**
   * sort the dataset by the given description
   * @param ranking
   */
  sort(ranking: IServerRankingDump): {groups: IOrderedGroup[], index2pos: IndicesArray};

  /**
   * returns a slice of the data array identified by a list of indices
   * @param indices
   */
  view(indices: number[]): Promise<any[]>;

  /**
   * returns a sample of the values for a given column
   * @param column
   */
  mappingSample(column: IColumnDesc): Promise<number[]>;

  /**
   * return the matching indices matching the given arguments
   * @param search
   * @param column
   */
  search(search: string | RegExp, column: IColumnDesc): Promise<number[]>;
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

  private readonly cache: LRUCache<number, Promise<IDataRow> | IDataRow>;

  private readonly tasks = <IRenderTasks>{

  };


  constructor(private server: IServerData, columns: IColumnDesc[] = [], options: Partial<IRemoteDataProviderOptions & IDataProviderOptions> = {}) {
    super(columns, options);
    Object.assign(this.options, options);
    this.cache = new LRUCache(this.options.maxCacheSize);
  }

  getTotalNumberOfRows() {
    return this.server.totalNumberOfRows;
  }

  getTaskExecutor() {
    return this.tasks;
  }

  sort(ranking: Ranking) {
    return this.server.sort({
      filter: ranking.flatColumns.filter((d) => d.isFiltered()).map((d) => d.dump(this.toDescRef)),
      sortCriteria: ranking.getSortCriteria().map((d) => ({asc: d.asc, col: d.col.dump(this.toDescRef)})),
      groupCriteria: ranking.getGroupCriteria().map((d) => d.dump(this.toDescRef)),
      groupSortCriteria: ranking.getGroupSortCriteria().map((d) => ({asc: d.asc, col: d.col.dump(this.toDescRef)}))
    });
  }

  private loadFromServer(indices: number[]): Promise<IDataRow[]> {
    return this.server.view(indices).then((view) => {
      //enhance with the data index
      return view.map((v, i) => {
        const dataIndex = indices[i];
        const r = {v, i: dataIndex};
        this.cache.set(dataIndex, r);
        return r;
      });
    });
  }

  view(indices: IndicesArray): Promise<any[]> {
    return this.viewRows(indices).then((rows: (IDataRow | null)[]) => rows.map((row) => row ? row.v : {}));
  }

  viewRows(indices: IndicesArray): Promise<IDataRow[]> {
    if (indices.length === 0) {
      return Promise.resolve([]);
    }
    const missing: number[] = [];
    let missingResolve: (value: IDataRow[]) => void;
    let missingReject: (reason?: any) => void;
    const missingLoader = new Promise<IDataRow[]>((resolve, reject) => {
      missingResolve = resolve;
      missingReject = reject;
    });
    const rows = mapIndices(indices, (i) => {
      const c = this.cache.get(i);
      if (c) {
        return c;
      }
      const missingIndex = missing.length;
      missing.push(i);
      const loader = missingLoader.then((loaded) => loaded[missingIndex]);
      this.cache.set(i, loader);
      return loader;
    });
    if (missing.length === 0) {
      return Promise.all(rows);
    }
    const loaded = this.load(missing);
    loaded.then((r) => missingResolve(r));
    loaded.catch((r) => missingReject(r));

    return Promise.all(rows);
  }

  private load(indices: number[]) {
    if (indices.length === 0) {
      return Promise.resolve<IDataRow[]>([]);
    }
    // load data and map to rows;
    return this.server.view(indices).then((rows) => {
      //enhance with the data index
      return rows.map((v, i) => {
        const dataIndex = indices[i];
        const r = {v, i: dataIndex};
        this.cache.set(dataIndex, r);
        return r;
      });
    });
  }

  getRow(index: number) {
    if (this.cache.has(index)) {
      return this.cache.get(index)!;
    }
    return this.viewRows([index]).then((r) => r[0]);
  }


  mappingSample(col: INumberColumn): Promise<number[]> {
    return this.server.mappingSample(col.desc);
  }

  searchAndJump(search: string | RegExp, col: Column) {
    this.server.search(search, col.desc).then((indices) => {
      this.jumpToNearest(indices);
    });
  }
}


// class RemoteTaskExecutor implements IRenderTasks {
//   groupRows<T>(col: Column, group: IOrderedGroup, key: string, compute: (rows: ISequence<IDataRow>) => T): IRenderTask<T>;
//   groupExampleRows<T>(col: Column, group: IOrderedGroup, key: string, compute: (rows: ISequence<IDataRow>) => T): IRenderTask<T>;

//   groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean): IRenderTask<{group: IAdvancedBoxPlotData, summary: IAdvancedBoxPlotData, data: IAdvancedBoxPlotData}>;
//   groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean): IRenderTask<{group: IStatistics, summary: IStatistics, data: IStatistics}>;
//   groupCategoricalStats(col: Column & ICategoricalLikeColumn, group: IOrderedGroup): IRenderTask<{group: ICategoricalStatistics, summary: ICategoricalStatistics, data: ICategoricalStatistics}>;
//   groupDateStats(col: Column & IDateColumn, group: IOrderedGroup): IRenderTask<{group: IDateStatistics, summary: IDateStatistics, data: IDateStatistics}>;

//   summaryBoxPlotStats(col: Column & INumberColumn, raw?: boolean): IRenderTask<{summary: IAdvancedBoxPlotData, data: IAdvancedBoxPlotData}>;
//   summaryNumberStats(col: Column & INumberColumn, raw?: boolean): IRenderTask<{summary: IStatistics, data: IStatistics}>;
//   summaryCategoricalStats(col: Column & ICategoricalLikeColumn): IRenderTask<{summary: ICategoricalStatistics, data: ICategoricalStatistics}>;
//   summaryDateStats(col: Column & IDateColumn): IRenderTask<{summary: IDateStatistics, data: IDateStatistics}>;
// }
