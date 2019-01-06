import {LRUCache, IEventContext} from '../../internal';
import Column, {IColumnDesc, IDataRow, IndicesArray, INumberColumn, Ranking, CompositeColumn, EDirtyReason} from '../../model';
import {mapIndices} from '../../model/internal';
import {IRenderTasks} from '../../renderer';
import ACommonDataProvider from '../ACommonDataProvider';
import {IDataProviderOptions} from '../interfaces';
import {IServerData, toRankingDump} from './interfaces';
import {index2pos} from '../internal';
import RemoteTaskExecutor from './RemoteTaskExecutor';

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

  private readonly tasks: RemoteTaskExecutor;

  constructor(private server: IServerData, columns: IColumnDesc[] = [], options: Partial<IRemoteDataProviderOptions & IDataProviderOptions> = {}) {
    super(columns, options);
    Object.assign(this.options, options);
    this.cache = new LRUCache(this.options.maxCacheSize);
    this.tasks = new RemoteTaskExecutor(server, {
      viewRows: this.viewRows.bind(this),
      toDescRef: this.toDescRef
    });
  }

  getTotalNumberOfRows() {
    return this.server.totalNumberOfRows;
  }

  getTaskExecutor() {
    return this.tasks;
  }

  cloneRanking(existing?: Ranking) {
    const ranking = super.cloneRanking(existing);
    this.trackRanking(ranking, existing);
    return ranking;
  }

  private trackRanking(ranking: Ranking, existing?: Ranking) {

    const that = this;
    ranking.on(`${Column.EVENT_DIRTY_CACHES}.cache`, function (this: IEventContext) {
      let col: any = this.origin;
      while (col instanceof Column) {
        console.log(col.label, 'dirty data');
        that.tasks.dirtyColumn(col, 'data');
        that.tasks.preComputeCol(col);
        col = col.parent;
      }
    });

    const cols = ranking.flatColumns;
    const addKey = `${Ranking.EVENT_ADD_COLUMN}.cache`;
    const removeKey = `${Ranking.EVENT_REMOVE_COLUMN}.cache`;

    const removeCol = (col: Column) => {
      this.tasks.dirtyColumn(col, 'data');
      if (col instanceof CompositeColumn) {
        col.on(addKey, null);
        col.on(removeKey, null);
      }
    };

    const addCol = (col: Column) => {
      this.tasks.preComputeCol(col);
      if (col instanceof CompositeColumn) {
        col.on(addKey, addCol);
        col.on(removeKey, removeCol);
      }
    };


    ranking.on(addKey, addCol);
    ranking.on(removeKey, removeCol);
    for (const col of cols) {
      if (col instanceof CompositeColumn) {
        col.on(addKey, addCol);
        col.on(removeKey, removeCol);
      }
    }

    if (existing) {
      const copy = existing.flatColumns;
      for (let i = 0; i < cols.length; ++i) {
        this.tasks.copyCache(cols[i], copy[i]);
      }
    }

    this.tasks.preComputeData(ranking);
  }

  cleanUpRanking(ranking: Ranking) {
    const cols = ranking.flatColumns;
    const addKey = `${Ranking.EVENT_ADD_COLUMN}.cache`;
    const removeKey = `${Ranking.EVENT_REMOVE_COLUMN}.cache`;
    ranking.on(addKey, null);
    ranking.on(removeKey, null);
    for (const col of cols) {
      if (col instanceof CompositeColumn) {
        col.on(addKey, null);
        col.on(removeKey, null);
      }
    }

    this.tasks.dirtyRanking(ranking, 'data');

    super.cleanUpRanking(ranking);
  }

  sort(ranking: Ranking, dirtyReason: EDirtyReason[]) {
    const reasons = new Set(dirtyReason);

    const filter = ranking.flatColumns.filter((d) => d.isFiltered()).map((d) => d.dump(this.toDescRef));

    const needsFiltering = reasons.has(EDirtyReason.UNKNOWN) || reasons.has(EDirtyReason.FILTER_CHANGED);
    const needsGrouping = needsFiltering || reasons.has(EDirtyReason.GROUP_CRITERIA_CHANGED) || reasons.has(EDirtyReason.GROUP_CRITERIA_DIRTY);

    if (needsFiltering) {
      this.tasks.dirtyRanking(ranking, 'summary');
    } else if (needsGrouping) {
      this.tasks.dirtyRanking(ranking, 'group');
    }
    // otherwise the summary and group summaries should still be valid

    if (filter.length === 0) {
      // all rows so summary = data
      this.tasks.copyData2Summary(ranking);
    }

    return this.server.sort(toRankingDump(ranking, this.toDescRef)).then(({groups, maxDataIndex}) => {
      const r = index2pos(groups, maxDataIndex);
      this.tasks.preCompute(ranking, groups);
      return r;
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
    return this.server.mappingSample(col.dump(this.toDescRef));
  }

  searchAndJump(search: string | RegExp, col: Column) {
    this.server.search(search, col.dump(this.toDescRef)).then((indices) => {
      this.jumpToNearest(indices);
    });
  }
}
