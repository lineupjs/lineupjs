import {IStatistics, ICategoricalStatistics, IDateStatistics, IAdvancedBoxPlotData, computeDateStats, computeNormalizedStats, computeHist} from '../internal/math';
import {IDataRow, INumberColumn, IDateColumn, ISetColumn, IOrderedGroup, IndicesArray, Ranking, ICategoricalLikeColumn} from '../model';
import Column from '../model/Column';
import {ISequence, lazySeq} from '../internal/interable';
import {IAbortAblePromise, ABORTED, abortAbleAll} from 'lineupengine';
import TaskScheduler from '../internal/scheduler';

export {IAbortAblePromise} from 'lineupengine';

export interface IRenderTask<T> {
  then<U = void>(onfullfilled: (value: T | symbol) => U): U | IAbortAblePromise<U>;
}

class TaskNow<T> implements IRenderTask<T> {
  constructor(public readonly v: T) {

  }

  then<U = void>(onfullfilled: (value: T) => U) {
    return onfullfilled(this.v);
  }
}

function taskNow<T>(v: T) {
  return new TaskNow(v);
}

class TaskLater<T> implements IRenderTask<T> {
  constructor(public readonly v: IAbortAblePromise<T>) {

  }

  then<U = void>(onfullfilled: (value: T | symbol) => U) {
    return this.v.then(onfullfilled);
  }
}

function taskLater<T>(v: IAbortAblePromise<T>) {
  return new TaskLater(v);
}

export function tasksAll<T>(tasks: IRenderTask<T>[]): IRenderTask<T[]> {
  if (tasks.every((t) => t instanceof TaskNow)) {
    return taskNow(tasks.map((d) => (<TaskNow<T>>d).v));
  }
  return taskLater(abortAbleAll((<(TaskNow<T> | TaskLater<T>)[]>tasks).map((d) => d.v)));
}

export interface IRenderTasks {
  groupRows<T>(col: Column, group: IOrderedGroup, key: string, compute: (rows: ISequence<IDataRow>) => T): IRenderTask<T>;
  groupExampleRows<T>(col: Column, group: IOrderedGroup, key: string, compute: (rows: ISequence<IDataRow>) => T): IRenderTask<T>;

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean): IRenderTask<{group: IAdvancedBoxPlotData, summary: IAdvancedBoxPlotData, data: IAdvancedBoxPlotData}>;
  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean): IRenderTask<{group: IStatistics, summary: IStatistics, data: IStatistics}>;
  groupCategoricalStats(col: Column & ICategoricalLikeColumn, group: IOrderedGroup): IRenderTask<{group: ICategoricalStatistics, summary: ICategoricalStatistics, data: ICategoricalStatistics}>;
  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup): IRenderTask<{group: IDateStatistics, summary: IDateStatistics, data: IDateStatistics}>;

  summaryBoxPlotStats(col: Column & INumberColumn, raw?: boolean): IRenderTask<{summary: IAdvancedBoxPlotData, data: IAdvancedBoxPlotData}>;
  summaryNumberStats(col: Column & INumberColumn, raw?: boolean): IRenderTask<{summary: IStatistics, data: IStatistics}>;
  summaryCategoricalStats(col: Column & ICategoricalLikeColumn): IRenderTask<{summary: ICategoricalStatistics, data: ICategoricalStatistics}>;
  summaryDateStats(col: Column & IDateColumn): IRenderTask<{summary: IDateStatistics, data: IDateStatistics}>;
}


export class DirectRenderTasks implements IRenderTasks {
  private readonly byIndex = (i: number) => this.data[i];

  private readonly dataCache = new Map<string, any>();

  constructor(private data: IDataRow[]) {

  }

  setData(data: IDataRow[]) {
    this.data = data;
    this.dataCache.clear();
  }

  dirtyColumn(col: Column) {
    this.dataCache.delete(col.id);
    this.dataCache.delete(`${col.id}.raw`);
  }

  private byOrder(indices: IndicesArray) {
    return lazySeq(indices).map(this.byIndex);
  }

  groupRows<T>(_col: Column, group: IOrderedGroup, _key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return taskNow(compute(this.byOrder(group.order)));
  }

  groupExampleRows<T>(_col: Column, group: IOrderedGroup, _key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return taskNow(compute(this.byOrder(group.order.slice(0, 5))));
  }

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    return this.groupNumberStats(col, group, raw);
  }

  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    const {summary, data} = this.summaryNumberStatsD(col, raw);
    const acc = raw ? col.iterRawNumber.bind(col) : col.iterNumber.bind(col);
    return taskNow({group: computeNormalizedStats(this.byOrder(group.order).map(acc)), summary, data});
  }

  groupCategoricalStats(col: Column & ISetColumn, group: IOrderedGroup) {
    const {summary, data} = this.summaryCategoricalStatsD(col);
    return taskNow({group: computeHist(this.byOrder(group.order).map((d) => col.iterCategory(d)), col.categories), summary, data});
  }

  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup) {
    const {summary, data} = this.summaryDateStatsD(col);
    return taskNow({group: computeDateStats(this.byOrder(group.order).map((d) => col.iterDate(d)), summary), summary, data});
  }

  summaryBoxPlotStats(col: Column & INumberColumn, raw?: boolean) {
    return this.summaryNumberStats(col, raw);
  }

  summaryNumberStats(col: Column & INumberColumn, raw?: boolean) {
    return taskNow(this.summaryNumberStatsD(col, raw));
  }

  summaryCategoricalStats(col: Column & ISetColumn) {
    return taskNow(this.summaryCategoricalStatsD(col));
  }

  summaryDateStats(col: Column & IDateColumn) {
    return taskNow(this.summaryDateStatsD(col));
  }

  private summaryNumberStatsD(col: Column & INumberColumn, raw?: boolean) {
    const ranking = col.findMyRanker()!.getOrder();
    const data = this.dataNumberStats(col, raw);
    const acc = raw ? col.iterRawNumber.bind(col) : col.iterNumber.bind(col);
    return {summary: computeNormalizedStats(this.byOrder(ranking).map(acc), data.hist.length), data};
  }

  private summaryCategoricalStatsD(col: Column & ISetColumn) {
    const ranking = col.findMyRanker()!.getOrder();
    const data = this.dataCategoricalStats(col);
    return {summary: computeHist(this.byOrder(ranking).map((d) => col.iterCategory(d)), col.categories), data};
  }

  private summaryDateStatsD(col: Column & IDateColumn) {
    const ranking = col.findMyRanker()!.getOrder();
    const data = this.dataDateStats(col);
    return {summary: computeDateStats(this.byOrder(ranking).map((d) => col.iterDate(d)), data), data};
  }

  dataBoxPlotStats(col: Column & INumberColumn, raw?: boolean) {
    return this.dataNumberStats(col, raw);
  }

  private cached<T>(col: Column, creator: () => T, suffix: string = '') {
    const key = `${col.id}${suffix}`;
    if (this.dataCache.has(key)) {
      return this.dataCache.get(key)!;
    }
    const s = creator();
    this.dataCache.set(key, s);
    return s;
  }

  dataNumberStats(col: Column & INumberColumn, raw?: boolean) {
    const acc = raw ? col.iterRawNumber.bind(col) : col.iterNumber.bind(col);
    return this.cached(col, () => computeNormalizedStats(lazySeq(this.data).map(acc)), raw ? '.raw' : '');
  }

  dataCategoricalStats(col: Column & ISetColumn) {
    return this.cached(col, () => computeHist(lazySeq(this.data).map((d) => col.iterCategory(d)), col.categories));
  }

  dataDateStats(col: Column & IDateColumn) {
    return this.cached(col, () => computeDateStats(lazySeq(this.data).map((d) => col.iterDate(d))));
  }

}


export class ScheduleRenderTasks extends TaskScheduler implements IRenderTasks {
  private readonly byIndex = (i: number) => this.data[i];

  private readonly cache = new Map<string, any>();

  constructor(private data: IDataRow[] = []) {
    super();
  }

  setData(data: IDataRow[]) {
    this.data = data;
    this.cache.clear();
    this.clear();
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
        this.abort(key);
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
        this.abort(key);
      }
    }
  }

  private byOrder(indices: IndicesArray) {
    return lazySeq(indices).map(this.byIndex);
  }

  groupRows<T>(col: Column, group: IOrderedGroup, key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return this.cached(`${col.id}:a:group:${group.name}:${key}`, () => compute(this.byOrder(group.order)));
  }

  groupExampleRows<T>(_col: Column, group: IOrderedGroup, _key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return taskNow(compute(this.byOrder(group.order.slice(0, 5))));
  }

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    return this.groupNumberStats(col, group, raw);
  }

  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    return this.chain(`${col.id}:a:group:${group.name}${raw ? ':raw' : ''}`, this.summaryNumberStats(col, raw), ({summary, data}) => {
      const acc = raw ? col.iterRawNumber.bind(col) : col.iterNumber.bind(col);
      return {group: computeNormalizedStats(this.byOrder(group.order).map(acc), summary.hist.length), summary, data};
    });
  }

  groupCategoricalStats(col: Column & ISetColumn, group: IOrderedGroup) {
    return this.chain(`${col.id}:a:group:${group.name}`, this.summaryCategoricalStats(col), ({summary, data}) => {
      return {group: computeHist(this.byOrder(group.order).map((d) => col.iterCategory(d)), col.categories), summary, data};
    });
  }

  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup) {
    return this.chain(`${col.id}:a:group:${group.name}`, this.summaryDateStats(col), ({summary, data}) => {
      return {group: computeDateStats(this.byOrder(group.order).map((d) => col.iterDate(d)), summary), summary, data};
    });
  }

  summaryBoxPlotStats(col: Column & INumberColumn, raw?: boolean) {
    return this.summaryNumberStats(col, raw);
  }

  summaryNumberStats(col: Column & INumberColumn, raw?: boolean) {
    const ranking = col.findMyRanker()!.getOrder();
    return this.chain(`${col.id}:b:summary${raw ? ':raw' : ''}`, this.dataNumberStats(col, raw), (data) => {
      const acc = raw ? col.iterRawNumber.bind(col) : col.iterNumber.bind(col);
      return {summary: computeNormalizedStats(this.byOrder(ranking).map(acc), data.hist.length), data};
    });
  }

  summaryCategoricalStats(col: Column & ISetColumn) {
    const ranking = col.findMyRanker()!.getOrder();
    return this.chain(`${col.id}:b:summary`, this.dataCategoricalStats(col), (data) => {
      return {summary: computeHist(this.byOrder(ranking).map((d) => col.iterCategory(d)), col.categories), data};
    });
  }

  summaryDateStats(col: Column & IDateColumn) {
    const ranking = col.findMyRanker()!.getOrder();
    return this.chain(`${col.id}:b:summary`, this.dataDateStats(col), (data) => {
      return {summary: computeDateStats(this.byOrder(ranking).map((d) => col.iterDate(d)), data), data};
    });
  }

  dataBoxPlotStats(col: Column & INumberColumn, raw?: boolean) {
    return this.dataNumberStats(col, raw);
  }

  private cached<T>(key: string, creator: () => T): IRenderTask<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const task = this.push(key, creator);
    const s = taskLater(task);
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

  private chain<T, U>(key: string, task: IRenderTask<T>, creator: (data: T) => U): IRenderTask<U> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    if (task instanceof TaskNow) {
      return this.cached(key, () => creator(task.v));
    }

    const v = (<TaskLater<T>>task).v;
    const subTask = v.then((data) => {
      if (typeof data === 'symbol') {
        return ABORTED;
      }
      return this.push(key, () => creator(data));
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

  dataNumberStats(col: Column & INumberColumn, raw?: boolean) {
    const acc = raw ? col.iterRawNumber.bind(col) : col.iterNumber.bind(col);
    return this.cached(`${col.id}:c:data${raw ? ':raw' : ''}`, () => computeNormalizedStats(lazySeq(this.data).map(acc)));
  }

  dataCategoricalStats(col: Column & ISetColumn) {
    return this.cached(`${col.id}:c:data`, () => computeHist(lazySeq(this.data).map((d) => col.iterCategory(d)), col.categories));
  }

  dataDateStats(col: Column & IDateColumn) {
    return this.cached(`${col.id}:c:data`, () => computeDateStats(lazySeq(this.data).map((d) => col.iterDate(d))));
  }
}
