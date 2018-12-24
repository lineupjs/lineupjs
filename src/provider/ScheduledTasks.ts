import {getNumberOfBins, IAdvancedBoxPlotData, ICategoricalStatistics, IDateStatistics, ISortMessageResponse, IStatistics, toIndexArray, WORKER_BLOB} from '../internal';
import {ISequence, lazySeq, WorkerTaskScheduler} from '../internal';
import TaskScheduler, {ABORTED, oneShotIterator} from '../internal/scheduler';
import Column, {ICategoricalLikeColumn, IDataRow, IDateColumn, IGroup, IndicesArray, INumberColumn, IOrderedGroup, isCategoricalLikeColumn, isDateColumn, isNumberColumn, Ranking,ICompareValue, UIntTypedArray} from '../model';
import {IRenderTask} from '../renderer/interfaces';
import {sortDirect} from './DirectRenderTasks';
import {CompareLookup} from './sort';
import {ARenderTasks, IRenderTaskExectutor, MultiIndices, taskLater, TaskLater, taskNow, TaskNow} from './tasks';
import {abortAble} from 'lineupengine';

export class ScheduleRenderTasks extends ARenderTasks implements IRenderTaskExectutor {

  private readonly cache = new Map<string, IRenderTask<any>>();
  private readonly tasks = new TaskScheduler();
  private readonly workers = new WorkerTaskScheduler(WORKER_BLOB);

  setData(data: IDataRow[]) {
    this.data = data;
    this.cache.clear();
    this.tasks.clear();
    this.valueCacheData.clear();
    this.workers.deleteRefs();
  }

  dirtyColumn(col: Column, type: 'data' | 'group' | 'summary') {
    super.dirtyColumn(col, type);
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
    this.workers.deleteRef(ranking.id, true);

    if (type !== 'data') {
      return;
    }

    for (const col of cols) {
      super.dirtyColumn(col, type);
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
          this.summaryNumberStats(col, true, multi);
        } else if (isDateColumn(col)) {
          this.summaryDateStats(col, multi);
        } else {
          continue;
        }
        // copy from summary to group and create proper structure
        this.chainCopy(`${col.id}:a:group:${group.name}`, this.cache.get(`${col.id}:b:summary`)!, (v: {summary: any, data: any}) => ({group: v.summary, summary: v.summary, data: v.data}));
        if (isNumberColumn(col)) {
          this.chainCopy(`${col.id}:a:group:${group.name}:raw`, this.cache.get(`${col.id}:b:summary:raw`)!, (v: {summary: any, data: any}) => ({group: v.summary, summary: v.summary, data: v.data}));
        }
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
      } else if (isDateColumn(col)) {
        this.summaryDateStats(col, full);
        for (const g of ogroups) {
          this.groupDateStats(col, g);
        }
      } else if (isNumberColumn(col)) {
        this.summaryNumberStats(col, false, full);
        this.summaryNumberStats(col, true, full);
        for (const g of ogroups) {
          this.groupNumberStats(col, g, false);
          this.groupNumberStats(col, g, true);
        }
      }
    }
  }

  preComputeData(ranking: Ranking) {
    for (const col of ranking.flatColumns) {
      if (isCategoricalLikeColumn(col)) {
        this.dataCategoricalStats(col);
      } else if (isNumberColumn(col)) {
        this.dataNumberStats(col, false);
        this.dataNumberStats(col, true);
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
      this.dataNumberStats(col, false);
      this.dataNumberStats(col, true);

      if (!ranking) {
        return;
      }
      this.summaryNumberStats(col, false);
      this.summaryNumberStats(col, true);
      for (const group of ranking.getGroups()) {
        this.groupNumberStats(col, group, false);
        this.groupNumberStats(col, group, true);
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
        this.dataNumberStats(col, false);
        this.dataNumberStats(col, true);
      } else if (isDateColumn(col)) {
        this.dataDateStats(col);
      } else {
        continue;
      }
      // copy from data to summary and create proper structure
      this.chainCopy(`${col.id}:b:summary`, this.cache.get(`${col.id}:c:data`)!, (data: any) => ({summary: data, data}));
      if (isNumberColumn(col)) {
        this.chainCopy(`${col.id}:b:summary:raw`, this.cache.get(`${col.id}:c:data:raw`)!, (data: any) => ({summary: data, data}));
      }
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
    return this.cached(`${col.id}:a:group:${group.name}:${key}`, oneShotIterator(() => compute(this.byOrder(group.order))));
  }

  groupExampleRows<T>(_col: Column, group: IOrderedGroup, _key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return taskNow(compute(this.byOrder(group.order.slice(0, 5))));
  }

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    return this.chain(`${col.id}:a:group:${group.name}${raw ? ':braw' : ':b'}`, this.summaryBoxPlotStats(col, raw), ({summary, data}) => {
      const ranking = col.findMyRanker()!;
      const key = raw ? `${col.id}:r` : col.id;
      if (this.valueCacheData.has(key) && group.order.length > 0) {
        // web worker version
        return () => this.workers.pushStats('boxplotStats', {}, key, <Float32Array>this.valueCacheData.get(key), `${ranking.id}:${group.name}`, group.order)
          .then((group) => ({group, summary, data}));
      }
      return this.boxplotBuilder(group.order, col, raw, (group) => ({group, summary, data}));
    });
  }

  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    return this.chain(`${col.id}:a:group:${group.name}${raw ? ':raw' : ''}`, this.summaryNumberStats(col, raw), ({summary, data}) => {
      const ranking = col.findMyRanker()!;
      const key = raw ? `${col.id}:r` : col.id;
      if (this.valueCacheData.has(key) && group.order.length > 0) {
        // web worker version
        return () => this.workers.pushStats('numberStats', {numberOfBins: summary.hist.length}, key, <Float32Array>this.valueCacheData.get(key), `${ranking.id}:${group.name}`, group.order)
          .then((group) => ({group, summary, data}));
      }
      return this.normalizedStatsBuilder(group.order, col, summary.hist.length, raw, (group) => ({group, summary, data}));
    });
  }

  groupCategoricalStats(col: Column & ICategoricalLikeColumn, group: IOrderedGroup) {
    return this.chain(`${col.id}:a:group:${group.name}`, this.summaryCategoricalStats(col), ({summary, data}) => {
      const ranking = col.findMyRanker()!;
      if (this.valueCacheData.has(col.id) && group.order.length > 0) {
        // web worker version
        return () => this.workers.pushStats('categoricalStats', {categories: col.categories.map((d) => d.name)}, col.id, <UIntTypedArray>this.valueCacheData.get(col.id), `${ranking.id}:${group.name}`, group.order)
          .then((group) => ({group, summary, data}));
      }
      return this.categoricalStatsBuilder(group.order, col, (group) => ({group, summary, data}));
    });
  }

  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup) {
    const key = `${col.id}:a:group:${group.name}`;
    return this.chain(key, this.summaryDateStats(col), ({summary, data}) => {
      const ranking = col.findMyRanker()!;
      if (this.valueCacheData.has(col.id) && group.order.length > 0) {
        // web worker version
        return () => this.workers.pushStats('dateStats', {template: summary}, col.id, <Float64Array>this.valueCacheData.get(col.id), `${ranking.id}:${group.name}`, group.order)
          .then((group) => ({group, summary, data}));
      }
      return this.dateStatsBuilder(group.order, col, summary, (group) => ({group, summary, data}));
    });
  }

  summaryBoxPlotStats(col: Column & INumberColumn, raw?: boolean, order?: MultiIndices) {
    return this.chain(`${col.id}:b:summary${raw ? ':braw' : ':b'}`, this.dataBoxPlotStats(col, raw), (data) => {
      const ranking = col.findMyRanker()!;
      const key = raw ? `${col.id}:r` : col.id;
      if (this.valueCacheData.has(key)) {
        // web worker version
        return () => this.workers.pushStats('boxplotStats', {}, key, <Float32Array>this.valueCacheData.get(key), ranking.id, order ? order.joined : ranking.getOrder())
          .then((summary) => ({summary, data}));
      }
      return this.boxplotBuilder(order ? order : ranking.getOrder(), col, raw, (summary) => ({summary, data}));
    });
  }

  summaryNumberStats(col: Column & INumberColumn, raw?: boolean, order?: MultiIndices) {
    return this.chain(`${col.id}:b:summary${raw ? ':raw' : ''}`, this.dataNumberStats(col, raw), (data) => {
      const ranking = col.findMyRanker()!;
      const key = raw ? `${col.id}:r` : col.id;
      if (this.valueCacheData.has(key)) {
        // web worker version
        return () => this.workers.pushStats('numberStats', {numberOfBins: data.hist.length}, key, <Float32Array>this.valueCacheData.get(key), ranking.id, order ? order.joined : ranking.getOrder())
          .then((summary) => ({summary, data}));
      }
      return this.normalizedStatsBuilder(order ? order : ranking.getOrder(), col, data.hist.length, raw, (summary) => ({summary, data}));
    });
  }

  summaryCategoricalStats(col: Column & ICategoricalLikeColumn, order?: MultiIndices) {
    return this.chain(`${col.id}:b:summary`, this.dataCategoricalStats(col), (data) => {
      const ranking = col.findMyRanker()!;
      if (this.valueCacheData.has(col.id)) {
        // web worker version
        return () => this.workers.pushStats('categoricalStats', {categories: col.categories.map((d) => d.name)}, col.id, <UIntTypedArray>this.valueCacheData.get(col.id), ranking.id, order ? order.joined : ranking.getOrder())
          .then((summary) => ({summary, data}));
      }
      return this.categoricalStatsBuilder(order ? order : ranking.getOrder(), col, (summary) => ({summary, data}));
    });
  }

  summaryDateStats(col: Column & IDateColumn, order?: MultiIndices) {
    return this.chain(`${col.id}:b:summary`, this.dataDateStats(col), (data) => {
      const ranking = col.findMyRanker()!;
      if (this.valueCacheData.has(col.id)) {
        // web worker version
        return () => this.workers.pushStats('dateStats', {template: data}, col.id, <Float64Array>this.valueCacheData.get(col.id), ranking.id, order ? order.joined : ranking.getOrder())
          .then((summary) => ({summary, data}));
      }
      return this.dateStatsBuilder(order ? order : ranking.getOrder(), col, data, (summary) => ({summary, data}));
    });
  }

  private cached<T>(key: string, it: Iterator<T | null> | (() => Promise<T>)): IRenderTask<T> {
    const dontCache = this.data.length === 0;

    if (this.cache.has(key) && !dontCache) {
      return this.cache.get(key)!;
    }

    const task = typeof it === 'function' ? abortAble(it()) : this.tasks.pushMulti(key, it);
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

  private chain<T, U>(key: string, task: IRenderTask<T>, creator: (data: T) => Iterator<U | null> | (() => Promise<U>)): IRenderTask<U> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    if (task instanceof TaskNow) {
      return this.cached(key, creator(task.v));
    }

    const v = (<TaskLater<T>>task).v;
    const subTask = v.then((data) => {
      if (typeof data === 'symbol') {
        return ABORTED;
      }
      const created = creator(data);
      if (typeof created === 'function') {
        // promise
        return created();
      }
      return this.tasks.pushMulti(key, created);
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
    const key = `${col.id}:c:data${raw ? ':braw' : ':b'}`;
    if (!raw && this.valueCacheData.has(col.id) && this.data.length > 0) {
      // use webworker
      return this.cached(key, () => this.workers.pushStats('boxplotStats', {}, col.id, <Float32Array>this.valueCacheData.get(col.id)!));
    }
    return this.cached(key, this.boxplotBuilder<IAdvancedBoxPlotData>(null, col, raw));
  }

  dataNumberStats(col: Column & INumberColumn, raw?: boolean) {
    return this.cached(`${col.id}:c:data${raw ? ':raw' : ''}`, this.normalizedStatsBuilder<IStatistics>(null, col, getNumberOfBins(this.data.length), raw));
  }

  dataCategoricalStats(col: Column & ICategoricalLikeColumn) {
    return this.cached(`${col.id}:c:data`, this.categoricalStatsBuilder<ICategoricalStatistics>(null, col));
  }

  dataDateStats(col: Column & IDateColumn) {
    return this.cached(`${col.id}:c:data`, this.dateStatsBuilder<IDateStatistics>(null, col));
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

  terminate() {
    this.workers.terminate();
    this.cache.clear();
    this.valueCacheData.clear();
  }
}
