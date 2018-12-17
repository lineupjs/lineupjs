import {getNumberOfBins, IAdvancedBoxPlotData, ICategoricalStatistics, IDateStatistics, ISortMessageResponse, IStatistics, toIndexArray, WORKER_BLOB, dateValueCache2Value, categoricalValueCache2Value} from '../internal';
import {ISequence, lazySeq} from '../internal/interable';
import TaskScheduler, {ABORTED, oneShotIterator} from '../internal/scheduler';
import {WorkerTaskScheduler} from '../internal/worker';
import Column, {ICategoricalLikeColumn, IDataRow, IDateColumn, IGroup, IndicesArray, INumberColumn, IOrderedGroup, isCategoricalLikeColumn, isDateColumn, isNumberColumn, Ranking, DateColumn, CategoricalColumn, OrdinalColumn, ICompareValue} from '../model';
import {IRenderTask} from '../renderer/interfaces';
import {sortDirect} from './DirectRenderTasks';
import {CompareLookup} from './sort';
import {ARenderTasks, IRenderTaskExectutor, MultiIndices, taskLater, TaskLater, taskNow, TaskNow} from './tasks';
import {abortAble} from 'lineupengine';

export class ScheduleRenderTasks extends ARenderTasks implements IRenderTaskExectutor {

  private readonly cache = new Map<string, IRenderTask<any>>();
  private readonly tasks = new TaskScheduler();
  private readonly workers = new WorkerTaskScheduler(WORKER_BLOB);

  constructor() {
    super();
  }


  setData(data: IDataRow[]) {
    this.data = data;
    this.cache.clear();
    this.tasks.clear();
    this.valueCacheData.clear();
  }

  dirtyColumn(col: Column, type: 'data' | 'group' | 'summary') {
    // order designed such that first groups, then summaries, then data is deleted

    for (const key of Array.from(this.cache.keys()).sort()) {
      // data = all
      // summary = summary + group
      // group = group only
      if ((type === 'data' && key.startsWith(`${col.id}:`) ||
        (type === 'summary' && key.startsWith(`${col.id}:b:summary:`)) ||
        (key.startsWith(`${col.id}:a:group`)))) {
        this.cache.delete(key);
        this.tasks.abort(key);
      }
    }

    if (type !== 'data') {
      return;
    }

    this.valueCacheData.delete(col.id);
    this.workers.deleteRef(col.id);
  }

  dirtyRanking(ranking: Ranking, type: 'data' | 'group' | 'summary') {
    const cols = ranking.flatColumns;

    let checker: ((key: string) => boolean)[];
    switch (type) {
      case 'group':
        checker = cols.map((col) => (key: string) => key.startsWith(`${col.id}:a:group`));
        break;
      case 'summary':
        checker = cols.map((col) => (key: string) => key.startsWith(`${col.id}:b:summary`) || key.startsWith(`${col.id}:a:group`));
        break;
      case 'data':
      default:
        checker = cols.map((col) => (key: string) => key.startsWith(`${col.id}:`));
        break;
    }
    for (const key of Array.from(this.cache.keys()).sort()) {
      if (checker.some((f) => f(key))) {
        this.cache.delete(key);
        this.tasks.abort(key);
      }
    }
    // group compare tasks
    this.tasks.abortAll((t) => t.id.startsWith(`r${ranking.id}:`));

    // delete remote caches
    this.workers.deleteRef(`${ranking.id}:`, true);

    if (type !== 'data') {
      return;
    }

    for (const col of cols) {
      this.valueCacheData.delete(col.id);
      this.workers.deleteRef(col.id);
    }
  }

  preCompute(ranking: Ranking, groups: {rows: IndicesArray, group: IGroup}[]) {
    if (groups.length === 0) {
      return;
    }
    const cols = ranking.flatColumns;
    if (groups.length === 1) {
      const {group, rows} = groups[0];
      const multi = new MultiIndices([rows]);
      for (const col of cols) {
        if (isCategoricalLikeColumn(col)) {
          this.summaryCategoricalStats(col, multi);
        } else if (isNumberColumn(col)) {
          this.summaryNumberStats(col, false, multi);
        } else if (isDateColumn(col)) {
          this.summaryDateStats(col, multi);
        } else {
          continue;
        }
        // copy from summary to group and create proper structure
        this.chainCopy(`${col.id}:a:group:${group.name}`, this.cache.get(`${col.id}:b:summary`)!, (v: {summary: any, data: any}) => ({group: v.summary, summary: v.summary, data: v.data}));
      }
      return;
    }

    const ogroups = groups.map(({rows, group}) => Object.assign({order: rows}, group));
    const full = new MultiIndices(groups.map((d) => d.rows));
    for (const col of cols) {
      if (isCategoricalLikeColumn(col)) {
        this.summaryCategoricalStats(col, full);
        for (const g of ogroups) {
          this.groupCategoricalStats(col, g);
        }
      } else if (isNumberColumn(col)) {
        this.summaryNumberStats(col, false, full);
        for (const g of ogroups) {
          this.groupNumberStats(col, g, false);
        }
      } else if (isDateColumn(col)) {
        this.summaryDateStats(col, full);
        for (const g of ogroups) {
          this.groupDateStats(col, g);
        }
      }
    }
  }

  preComputeData(ranking: Ranking) {
    for (const col of ranking.flatColumns) {
      if (isCategoricalLikeColumn(col)) {
        this.dataCategoricalStats(col);
      } else if (isNumberColumn(col)) {
        this.dataNumberStats(col);
      } else if (isDateColumn(col)) {
        this.dataDateStats(col);
      }
    }
  }

  preComputeCol(col: Column) {
    const ranking = col.findMyRanker();

    if (isCategoricalLikeColumn(col)) {
      this.dataCategoricalStats(col);
      if (!ranking) {
        return;
      }
      this.summaryCategoricalStats(col);
      for (const group of ranking.getGroups()) {
        this.groupCategoricalStats(col, group);
      }
      return;
    }

    if (isNumberColumn(col)) {
      this.dataNumberStats(col);

      if (!ranking) {
        return;
      }
      this.summaryNumberStats(col);
      for (const group of ranking.getGroups()) {
        this.groupNumberStats(col, group);
      }
      return;
    }

    if (!isDateColumn(col)) {
      return;
    }

    this.dataDateStats(col);

    if (!ranking) {
      return;
    }
    this.summaryDateStats(col);
    for (const group of ranking.getGroups()) {
      this.groupDateStats(col, group);
    }
  }

  copyData2Summary(ranking: Ranking) {
    for (const col of ranking.flatColumns) {
      if (isCategoricalLikeColumn(col)) {
        this.dataCategoricalStats(col);
      } else if (isNumberColumn(col)) {
        this.dataNumberStats(col);
      } else if (isDateColumn(col)) {
        this.dataDateStats(col);
      } else {
        continue;
      }
      // copy from data to summary and create proper structure
      this.chainCopy(`${col.id}:b:summary`, this.cache.get(`${col.id}:c:data`)!, (data: any) => ({summary: data, data}));
    }
  }

  copyCache(col: Column, from: Column) {
    const fromPrefix = `${from.id}:`;

    for (const key of Array.from(this.cache.keys()).sort()) {
      if (!key.startsWith(fromPrefix)) {
        continue;
      }
      const tkey = `${col.id}:${key.slice(fromPrefix.length)}`;
      this.chainCopy(tkey, this.cache.get(key)!, (data: any) => data);
    }
  }

  groupCompare(ranking: Ranking, group: IGroup, rows: IndicesArray) {
    return taskLater(this.tasks.push(`r${ranking.id}:${group.name}`, () => {
      const rg = ranking.getGroupSortCriteria();
      if (rg.length === 0) {
        return [group.name.toLowerCase()];
      }
      const o = this.byOrder(rows);
      const vs: ICompareValue[] = [];
      for (const s of rg) {
        const cache = this.valueCache(s.col);
        const r = s.col.toCompareGroupValue(o, group, cache ? lazySeq(rows).map((d) => cache(d)) : undefined);
        if (Array.isArray(r)) {
          vs.push(...r);
        } else {
          vs.push(r);
        }
      }
      vs.push(group.name.toLowerCase());
      return vs;
    }));
  }

  groupRows<T>(col: Column, group: IOrderedGroup, key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return this.cached(`${col.id}:a:group:${group.name}:${key}`, group.order.length === 0, oneShotIterator(() => compute(this.byOrder(group.order))));
  }

  groupExampleRows<T>(_col: Column, group: IOrderedGroup, _key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return taskNow(compute(this.byOrder(group.order.slice(0, 5))));
  }

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    return this.chain(`${col.id}:a:group:${group.name}${raw ? ':braw' : ':b'}`, this.summaryBoxPlotStats(col, raw), ({summary, data}) => {
      return this.boxplotBuilder(group.order, col, raw, (group) => ({group, summary, data}));
    });
  }

  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    return this.chain(`${col.id}:a:group:${group.name}${raw ? ':raw' : ''}`, this.summaryNumberStats(col, raw), ({summary, data}) => {
      return this.normalizedStatsBuilder(group.order, col, summary.hist.length, raw, (group) => ({group, summary, data}));
    });
  }

  groupCategoricalStats(col: Column & ICategoricalLikeColumn, group: IOrderedGroup) {
    return this.chain(`${col.id}:a:group:${group.name}`, this.summaryCategoricalStats(col), ({summary, data}) => {
      return this.categoricalStatsBuilder(group.order, col, (group) => ({group, summary, data}));
    });
  }

  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup) {
    const key = `${col.id}:a:group:${group.name}`;
    return this.chain(key, this.summaryDateStats(col), ({summary, data}) => {
      return this.dateStatsBuilder(group.order, col, summary, (group) => ({group, summary, data}));
    });
  }

  summaryBoxPlotStats(col: Column & INumberColumn, raw?: boolean, order?: MultiIndices) {
    return this.chain(`${col.id}:b:summary${raw ? ':braw' : ':b'}`, this.dataBoxPlotStats(col, raw), (data) => {
      return this.boxplotBuilder(order ? order : new MultiIndices(col.findMyRanker()!.getGroups().map((d) => d.order)), col, raw, (summary) => ({summary, data}));
    });
  }

  summaryNumberStats(col: Column & INumberColumn, raw?: boolean, order?: MultiIndices) {
    return this.chain(`${col.id}:b:summary${raw ? ':raw' : ''}`, this.dataNumberStats(col, raw), (data) => {
      return this.normalizedStatsBuilder(order ? order : new MultiIndices(col.findMyRanker()!.getGroups().map((d) => d.order)), col, data.hist.length, raw, (summary) => ({summary, data}));
    });
  }

  summaryCategoricalStats(col: Column & ICategoricalLikeColumn, order?: MultiIndices) {
    return this.chain(`${col.id}:b:summary`, this.dataCategoricalStats(col), (data) => {
      return this.categoricalStatsBuilder(order ? order : new MultiIndices(col.findMyRanker()!.getGroups().map((d) => d.order)), col, (summary) => ({summary, data}));
    });
  }

  summaryDateStats(col: Column & IDateColumn, order?: MultiIndices) {
    return this.chain(`${col.id}:b:summary`, this.dataDateStats(col), (data) => {
      return this.dateStatsBuilder(order ? order : new MultiIndices(col.findMyRanker()!.getGroups().map((d) => d.order)), col, data, (summary) => ({summary, data}));
    });
  }

  private cached<T>(key: string, dontCache: boolean, it: Iterator<T | null>): IRenderTask<T> {
    if (this.cache.has(key) && !dontCache) {
      return this.cache.get(key)!;
    }

    const task = this.tasks.pushMulti(key, it);
    const s = taskLater(task);
    if (!dontCache) {
      this.cache.set(key, s);
    }
    task.then((r) => {
      if (typeof r === 'symbol') {
        return;
      }
      if (this.cache.get(key) === s) {
        // still same value replace with faster version
        this.cache.set(key, taskNow(r));
      }
    });
    return s;
  }

  private cachedWorker<T>(key: string, creator: () => Promise<T>): IRenderTask<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const task = creator();
    const s = taskLater(abortAble(task));
    this.cache.set(key, s);

    task.then((r) => {
      if (typeof r === 'symbol') {
        return;
      }
      if (this.cache.get(key) === s) {
        // still same value replace with faster version
        this.cache.set(key, taskNow(r));
      }
    });
    return s;
  }

  private chain<T, U>(key: string, task: IRenderTask<T>, creator: (data: T) => Iterator<U | null>): IRenderTask<U> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    if (task instanceof TaskNow) {
      return this.cached(key, false, creator(task.v));
    }

    const v = (<TaskLater<T>>task).v;
    const subTask = v.then((data) => {
      if (typeof data === 'symbol') {
        return ABORTED;
      }
      return this.tasks.pushMulti(key, creator(data));
    });
    const s = taskLater(subTask);
    this.cache.set(key, s);
    subTask.then((r) => {
      if (typeof r === 'symbol') {
        return;
      }
      if (this.cache.get(key) === s) {
        // still same value replace with faster version
        this.cache.set(key, taskNow(r));
      }
    });
    return s;
  }

  private chainCopy<T, U>(key: string, task: IRenderTask<T>, creator: (data: T) => U): IRenderTask<U> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    if (task instanceof TaskNow) {
      const subTask = taskNow(creator(task.v));
      this.cache.set(key, subTask);
      return subTask;
    }

    const v = (<TaskLater<T>>task).v;
    const subTask = v.then((data) => {
      if (typeof data === 'symbol') {
        return ABORTED;
      }
      return creator(data);
    });
    const s = taskLater(subTask);
    this.cache.set(key, s);
    subTask.then((r) => {
      if (typeof r === 'symbol') {
        return;
      }
      if (this.cache.get(key) === s) {
        // still same value replace with faster version
        this.cache.set(key, taskNow(r));
      }
    });
    return s;
  }

  dataBoxPlotStats(col: Column & INumberColumn, raw?: boolean) {
    if (!raw && this.valueCacheData.has(col.id)) {
      // use webworker
      return this.cachedWorker(`${col.id}:c:data:b`, () => {
        return this.workers.pushStats('boxplotStats', {}, col.id, <Float32Array>this.valueCacheData.get(col.id)!);
      });
    }
    return this.cached(`${col.id}:c:data${raw ? ':braw' : ':b'}`, this.data.length === 0, this.boxplotBuilder<IAdvancedBoxPlotData>(null, col, raw));
  }

  dataNumberStats(col: Column & INumberColumn, raw?: boolean) {
    return this.cached(`${col.id}:c:data${raw ? ':raw' : ''}`, this.data.length === 0, this.normalizedStatsBuilder<IStatistics>(null, col, getNumberOfBins(this.data.length), raw));
  }

  dataCategoricalStats(col: Column & ICategoricalLikeColumn) {
    return this.cached(`${col.id}:c:data`, this.data.length === 0, this.categoricalStatsBuilder<ICategoricalStatistics>(null, col));
  }

  dataDateStats(col: Column & IDateColumn) {
    return this.cached(`${col.id}:c:data`, this.data.length === 0, this.dateStatsBuilder<IDateStatistics>(null, col));
  }

  sort(ranking: Ranking, group: IGroup, indices: IndicesArray, singleCall: boolean, lookups?: CompareLookup) {
    if (!lookups) {
      // no thread needed
      const order = sortDirect(indices, lookups);
      return Promise.resolve(order);
    }

    const indexArray = toIndexArray(indices);
    const toTransfer = [indexArray.buffer];

    if (singleCall) {
      // can transfer otherwise need to copy
      toTransfer.push(...lookups.transferAbles);
    }

    return this.workers.push('sort', {
      ref: `${ranking.id}:${group.name}`,
      indices: indexArray,
      sortOrders: lookups.sortOrders
    }, toTransfer, (r: ISortMessageResponse) => r.order);
  }

  valueCache(col: Column) {
    const v = this.valueCacheData.get(col.id);
    if (!v) {
      return undefined;
    }
    if (col instanceof DateColumn) {
      return (dataIndex: number) => dateValueCache2Value(v[dataIndex]);
    }
    if (col instanceof CategoricalColumn || col instanceof OrdinalColumn) {
      return (dataIndex: number) => categoricalValueCache2Value(v[dataIndex], col.categories);
    }
    return (dataIndex: number) => v[dataIndex];
  }

  terminate() {
    this.workers.terminate();
    this.cache.clear();
  }
}
