import {abortAble} from 'lineupengine';
import {Column, ICategoricalLikeColumn, ICategoricalStatistics, IDataRow, IDateColumn, IDateStatistics, IndicesArray, INumberColumn, IOrderedGroup, isCategoricalLikeColumn, isDateColumn, isNumberColumn, Ranking} from '../..';
import {NUM_OF_EXAMPLE_ROWS} from '../../constants';
import {ISequence} from '../../internal';
import {IRenderTask, IRenderTasks} from '../../renderer';
import {ABORTED} from '../interfaces';
import {taskLater, TaskLater, taskNow, TaskNow} from '../tasks';
import {IMultiNumberStatistics, IServerData, toRankingDump} from './interfaces';

interface IProviderAdapter {
  viewRows(indices: IndicesArray): Promise<IDataRow[]>;
  toDescRef(desc: any): any;
}

export default class RemoteTaskExecutor implements IRenderTasks {
  private readonly cache = new Map<string, any>();

  constructor(private readonly server: IServerData, private readonly adapter: IProviderAdapter) {

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
      }
    }
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
      }
    }
  }

  preCompute(ranking: Ranking, groups: IOrderedGroup[]) {
    if (groups.length === 0) {
      return;
    }

    const columns = ranking.flatColumns;
    const dump = toRankingDump(ranking, this.adapter.toDescRef);
    const computeAble = columns.filter((col) => (isCategoricalLikeColumn(col) || isNumberColumn(col) || isDateColumn(col))).map((d) => d.dump(this.adapter.toDescRef));


    const toLoadData = computeAble.filter((col) => !this.cache.has(`${col.id}:c:data:m`));
    if (toLoadData.length > 0) {
      const data = this.server.computeDataStats(toLoadData);
      toLoadData.forEach((col, i) => {
        this.cache.set(`${col.id}:c:data:m`, data.then((rows) => rows[i]));
      });
    }
    const toLoadSummary = computeAble.filter((col) => !this.cache.has(`${col.id}:b:summary:m`));
    if (toLoadSummary.length > 0) {
      const data = this.server.computeRankingStats(dump, toLoadData);
      toLoadSummary.forEach((col, i) => {
        this.cache.set(`${col.id}:b:summary:m`, Promise.all([this.cache.get(`${col.id}:c:data:m`)!, data]).then(([data, rows]) => ({data, summary: rows[i]})));
      });
    }

    if (groups.length === 1) {
      const group = groups[0];
      for (const col of computeAble) {
        // copy from summary to group and create proper structure
        this.chainCopy(`${col.id}:a:group:${group.name}`, this.cache.get(`${col.id}:b:summary`)!, (v: {summary: any, data: any}) => ({group: v.summary, summary: v.summary, data: v.data}));
        if (isNumberColumn(col)) {
          this.chainCopy(`${col.id}:a:group:${group.name}:raw`, this.cache.get(`${col.id}:b:summary:raw`)!, (v: {summary: any, data: any}) => ({group: v.summary, summary: v.summary, data: v.data}));
        }
      }
      return;
    }

    for (const g of groups) {
      const toLoadGroup = computeAble.filter((col) => !this.cache.has(`${col.id}:a:group:${g.name}:m`));
      if (toLoadGroup.length === 0) {
        continue;
      }

      const data = this.server.computeGroupStats(dump, g.name, toLoadData);
      toLoadGroup.forEach((col, i) => {
        this.cache.set(`${col.id}:a:group:${g.name}:m`, Promise.all([this.cache.get(`${col.id}:b:summary:m`)!, data]).then(([summary, rows]) => ({...summary, group: rows[i]})));
      });
    }
  }

  preComputeData(ranking: Ranking) {
    const columns = ranking.flatColumns;
    const computeAble = columns.filter((col) => (isCategoricalLikeColumn(col) || isNumberColumn(col) || isDateColumn(col))).map((d) => d.dump(this.adapter.toDescRef));

    const toLoadData = computeAble.filter((col) => !this.cache.has(`${col.id}:c:data:m`));
    if (toLoadData.length === 0) {
      return;
    }

    const data = this.server.computeDataStats(toLoadData);
    toLoadData.forEach((col, i) => {
      this.cache.set(`${col.id}:c:data:m`, data.then((rows) => rows[i]));
    });
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

  groupRows<T>(col: Column, group: IOrderedGroup, key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return this.cached(`${col.id}:a:group:${group.name}:${key}`, () => this.rows(group.order, compute));
  }

  groupExampleRows<T>(_col: Column, group: IOrderedGroup, _key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return taskLater(abortAble(this.rows(group.order.slice(0, NUM_OF_EXAMPLE_ROWS), compute)));
  }

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    return this.cached(`${col.id}:a:group:${group.name}${raw ? ':braw' : ':b'}`, () => this.groupStats<IMultiNumberStatistics>(col, group).then((r) => ({
      data: raw ? r.data.rawBoxPlot : r.data.normalizedBoxPlot,
      summary: raw ? r.summary.rawBoxPlot : r.summary.normalizedBoxPlot,
      group: raw ? r.group.rawBoxPlot : r.group.normalizedBoxPlot
    })));
  }

  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    return this.cached(`${col.id}:a:group:${group.name}${raw ? ':raw' : ''}`, () => this.groupStats<IMultiNumberStatistics>(col, group).then((r) => ({
      data: raw ? r.data.raw : r.data.normalized,
      summary: raw ? r.summary.raw : r.summary.normalized,
      group: raw ? r.group.raw : r.group.normalized
    })));
  }

  groupCategoricalStats(col: Column & ICategoricalLikeColumn, group: IOrderedGroup) {
    return this.cached(`${col.id}:a:group:${group.name}`, () => this.groupStats<ICategoricalStatistics>(col, group));
  }

  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup) {
    return this.cached(`${col.id}:a:group:${group.name}`, () => this.groupStats<IDateStatistics>(col, group));
  }

  summaryBoxPlotStats(col: Column & INumberColumn, raw?: boolean) {
    return this.cached(`${col.id}:b:summary${raw ? ':braw' : ':b'}`, () => this.summaryStats<IMultiNumberStatistics>(col).then((r) => ({
      data: raw ? r.data.rawBoxPlot : r.data.normalizedBoxPlot,
      summary: raw ? r.summary.rawBoxPlot : r.summary.normalizedBoxPlot
    })));
  }

  summaryNumberStats(col: Column & INumberColumn, raw?: boolean) {
    return this.cached(`${col.id}:b:summary${raw ? ':raw' : ''}`, () => this.summaryStats<IMultiNumberStatistics>(col).then((r) => ({
      data: raw ? r.data.raw : r.data.normalized,
      summary: raw ? r.summary.raw : r.summary.normalized
    })));
  }

  summaryCategoricalStats(col: Column & ICategoricalLikeColumn) {
    return this.cached(`${col.id}:b:summary`, () => this.summaryStats<ICategoricalStatistics>(col));
  }

  summaryDateStats(col: Column & IDateColumn) {
    return this.cached(`${col.id}:b:summary`, () => this.summaryStats<IDateStatistics>(col));
  }


  private isValidCacheEntry(key: string) {
    if (!this.cache.has(key)) {
      return false;
    }
    const v = this.cache.get(key);
    // not an aborted task
    return !((v instanceof TaskNow) && typeof v.v === 'symbol') && !(v instanceof TaskLater && v.v.isAborted());
  }

  private chainCopy<T, U>(key: string, task: IRenderTask<T>, creator: (data: T) => U): IRenderTask<U> {
    if (this.isValidCacheEntry(key)) {
      return this.cache.get(key)!;
    }
    if (task instanceof TaskNow) {
      if (typeof task.v === 'symbol') {
        // aborted
        return taskNow(ABORTED);
      }
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
      if (this.cache.get(key) !== s) {
        return;
      }
      if (typeof r === 'symbol') {
        this.cache.delete(key);
      } else {
        this.cache.set(key, taskNow(r));
      }
    });
    return s;
  }

  dataBoxPlotStats(col: Column & INumberColumn, raw?: boolean) {
    return this.cached(`${col.id}:c:data${raw ? ':braw' : ':b'}`, () => this.dataStats<IMultiNumberStatistics>(col).then((r) => raw ? r.rawBoxPlot : r.normalizedBoxPlot));
  }

  dataNumberStats(col: Column & INumberColumn, raw?: boolean) {
    return this.cached(`${col.id}:c:data${raw ? ':raw' : ''}`, () => this.dataStats<IMultiNumberStatistics>(col).then((r) => raw ? r.raw : r.normalized));
  }

  dataCategoricalStats(col: Column & ICategoricalLikeColumn) {
    return this.cached(`${col.id}:c:data`, () => this.dataStats<ICategoricalStatistics>(col));
  }

  dataDateStats(col: Column & IDateColumn) {
    return this.cached(`${col.id}:c:data`, () => this.dataStats<IDateStatistics>(col));
  }

  private cached<T>(key: string, creator: () => Promise<T>): IRenderTask<T> {
    if (this.isValidCacheEntry(key)) {
      return this.cache.get(key)!;
    }

    const task = abortAble(creator());
    const s = taskLater(task);
    this.cache.set(key, s);
    task.then((r) => {
      if (this.cache.get(key) !== s) {
        return;
      }
      if (typeof r === 'symbol') {
        this.cache.delete(key);
      } else {
        this.cache.set(key, taskNow(r));
      }
    });
    return s;
  }

  private dataStats<T>(col: Column): Promise<T> {
    const key = `${col.id}:c:data:m`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const data = this.server.computeDataStats([col.dump(this.adapter.toDescRef)]).then((r) => r[0]);
    this.cache.set(key, data);
    return <any>data;
  }

  private summaryStats<T>(col: Column): Promise<{data: T, summary: T}> {
    const key = `${col.id}:b:summary:m`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const data = this.dataStats<T>(col);
    const ranking = toRankingDump(col.findMyRanker()!, this.adapter.toDescRef);
    const summary = <Promise<T>><unknown>this.server.computeRankingStats(ranking, [col.dump(this.adapter.toDescRef)]).then((r) => r[0]);
    const v = Promise.all([data, summary]).then(([data, summary]) => ({data, summary}));
    this.cache.set(key, v);
    return v;
  }

  private groupStats<T>(col: Column, g: IOrderedGroup): Promise<{data: T, summary: T, group: T}> {
    const key = `${col.id}:a:group:${g.name}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const summary = this.summaryStats<T>(col);
    const ranking = toRankingDump(col.findMyRanker()!, this.adapter.toDescRef);
    const group = <Promise<T>><unknown>this.server.computeGroupStats(ranking, g.name, [col.dump(this.adapter.toDescRef)]).then((r) => r[0]);
    const v = Promise.all([summary, group]).then(([summary, group]) => ({...summary, group}));
    this.cache.set(key, v);
    return v;
  }

  private rows<T>(indices: IndicesArray, compute: (rows: ISequence<IDataRow>) => T) {
    return this.adapter.viewRows(indices).then(compute);
  }

  terminate() {
    this.cache.clear();
  }
}
