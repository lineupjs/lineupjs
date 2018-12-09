import {IStatistics, ICategoricalStatistics, IDateStatistics, IAdvancedBoxPlotData, computeDateStats, computeNormalizedStats, computeHist, computeBoxPlot} from '../internal/math';
import {IDataRow, INumberColumn, IDateColumn, ISetColumn, IOrderedGroup, IndicesArray, Ranking, ICategoricalLikeColumn, IGroup, NumberColumn, OrdinalColumn, ImpositionCompositeColumn, ICategory, CategoricalColumn, DateColumn, isCategoricalLikeColumn, isNumberColumn, isDateColumn} from '../model';
import Column, {ICompareValue} from '../model/Column';
import {ISequence, lazySeq, IForEachAble, concatSeq} from '../internal/interable';
import {IAbortAblePromise, ABORTED, abortAbleAll, abortAble} from 'lineupengine';
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
    // wrap to avoid that the task will be aborted
    return abortAble(this.v).then(onfullfilled);
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

export interface IRenderTaskExectutor extends IRenderTasks {
  setData(data: IDataRow[]): void;
  dirtyColumn(col: Column, type: 'data' | 'summary' | 'group'): void;
  dirtyRanking(ranking: Ranking, type: 'data' | 'summary' | 'group'): void;

  groupCompare(ranking: Ranking, group: IGroup, rows: ISequence<IDataRow>): IRenderTask<ICompareValue[]>;

  preCompute(ranking: Ranking, groups: {rows: IndicesArray, group: IGroup}[]): void;
  copyData2Summary(ranking: Ranking): void;
}

function chooseAccNumber(col: Column & INumberColumn, raw?: boolean): (row: IDataRow) => IForEachAble<number> | number {
  if (col instanceof NumberColumn || col instanceof OrdinalColumn || col instanceof ImpositionCompositeColumn) {
    return raw ? col.getRawNumber.bind(col) : col.getNumber.bind(col);
  }
  return raw ? col.iterRawNumber.bind(col) : col.iterNumber.bind(col);
}

function chooseAccCategory(col: Column & ICategoricalLikeColumn): (row: IDataRow) => IForEachAble<ICategory | null> | ICategory | null {
  if (col instanceof CategoricalColumn || col instanceof OrdinalColumn) {
    return col.getCategory.bind(col);
  }
  return col.iterCategory.bind(col);
}

function chooseAccDate(col: Column & IDateColumn): (row: IDataRow) => IForEachAble<Date | null> | Date | null {
  if (col instanceof DateColumn) {
    return col.getDate.bind(col);
  }
  return col.iterDate.bind(col);
}

export class DirectRenderTasks implements IRenderTaskExectutor {
  private readonly byIndex = (i: number) => this.data[i];

  private readonly dataCache = new Map<string, any>();

  constructor(private data: IDataRow[] = []) {

  }

  setData(data: IDataRow[]) {
    this.data = data;
    this.dataCache.clear();
  }

  dirtyColumn(col: Column, type: 'data' | 'summary' | 'group') {
    if (type !== 'data') {
      // only data is cached
      return;
    }
    this.dataCache.delete(col.id);
    this.dataCache.delete(`${col.id}.raw`);
    this.dataCache.delete(`${col.id}.b`);
    this.dataCache.delete(`${col.id}.braw`);
  }

  dirtyRanking(ranking: Ranking, type: 'data' | 'summary' | 'group') {
    if (type !== 'data') {
      return;
    }

    for (const col of ranking.flatColumns) {
      this.dirtyColumn(col, 'data');
    }
  }

  preCompute() {
    // dummy
  }

  preComputeData() {
    // dummy
  }

  copyData2Summary() {
    // dummy
  }

  private byOrder(indices: IndicesArray) {
    return lazySeq(indices).map(this.byIndex);
  }

  private byOrderAcc<T>(indices: IndicesArray, acc: (row: IDataRow) => T) {
    return lazySeq(indices).map((i) => acc(this.data[i]));
  }

  groupCompare(ranking: Ranking, group: IGroup, rows: ISequence<IDataRow>) {
    return taskNow(ranking.toGroupCompareValue(rows, group));
  }

  groupRows<T>(_col: Column, group: IOrderedGroup, _key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return taskNow(compute(this.byOrder(group.order)));
  }

  groupExampleRows<T>(_col: Column, group: IOrderedGroup, _key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return taskNow(compute(this.byOrder(group.order.slice(0, 5))));
  }

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    const {summary, data} = this.summaryBoxPlotStatsD(col, raw);
    const acc = chooseAccNumber(col, raw);
    return taskNow({group: computeBoxPlot(this.byOrderAcc(group.order, acc)), summary, data});
  }

  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    const {summary, data} = this.summaryNumberStatsD(col, raw);
    const acc = chooseAccNumber(col, raw);
    return taskNow({group: computeNormalizedStats(this.byOrderAcc(group.order, acc)), summary, data});
  }

  groupCategoricalStats(col: Column & ISetColumn, group: IOrderedGroup) {
    const {summary, data} = this.summaryCategoricalStatsD(col);
    const acc = chooseAccCategory(col);
    return taskNow({group: computeHist(this.byOrderAcc(group.order, acc), col.categories), summary, data});
  }

  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup) {
    const {summary, data} = this.summaryDateStatsD(col);
    const acc = chooseAccDate(col);
    return taskNow({group: computeDateStats(this.byOrderAcc(group.order, acc), summary), summary, data});
  }

  summaryBoxPlotStats(col: Column & INumberColumn, raw?: boolean) {
    return taskNow(this.summaryBoxPlotStatsD(col, raw));
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
    const acc = chooseAccNumber(col, raw);
    return {summary: computeNormalizedStats(this.byOrderAcc(ranking, acc), data.hist.length), data};
  }

  private summaryBoxPlotStatsD(col: Column & INumberColumn, raw?: boolean) {
    const ranking = col.findMyRanker()!.getOrder();
    const data = this.dataBoxPlotStats(col, raw);
    const acc = chooseAccNumber(col, raw);
    return {summary: computeBoxPlot(this.byOrderAcc(ranking, acc)), data};
  }

  private summaryCategoricalStatsD(col: Column & ISetColumn) {
    const ranking = col.findMyRanker()!.getOrder();
    const data = this.dataCategoricalStats(col);
    const acc = chooseAccCategory(col);
    return {summary: computeHist(this.byOrderAcc(ranking, acc), col.categories), data};
  }

  private summaryDateStatsD(col: Column & IDateColumn) {
    const ranking = col.findMyRanker()!.getOrder();
    const data = this.dataDateStats(col);
    const acc = chooseAccDate(col);
    return {summary: computeDateStats(this.byOrderAcc(ranking, acc), data), data};
  }


  private cached<T>(col: Column, creator: () => T, suffix: string = ''): T {
    const key = `${col.id}${suffix}`;
    if (this.dataCache.has(key)) {
      return this.dataCache.get(key)!;
    }
    const s = creator();
    this.dataCache.set(key, s);
    return s;
  }

  dataBoxPlotStats(col: Column & INumberColumn, raw?: boolean) {
    const acc = chooseAccNumber(col, raw);
    return this.cached(col, () => computeBoxPlot(lazySeq(this.data).map(acc)), raw ? '.braw' : '.b');
  }

  dataNumberStats(col: Column & INumberColumn, raw?: boolean) {
    const acc = chooseAccNumber(col, raw);
    return this.cached(col, () => computeNormalizedStats(lazySeq(this.data).map(acc)), raw ? '.raw' : '');
  }

  dataCategoricalStats(col: Column & ISetColumn) {
    const acc = chooseAccCategory(col);
    return this.cached(col, () => computeHist(lazySeq(this.data).map(acc), col.categories));
  }

  dataDateStats(col: Column & IDateColumn) {
    const acc = chooseAccDate(col);
    return this.cached(col, () => computeDateStats(lazySeq(this.data).map(acc)));
  }

}


export class ScheduleRenderTasks extends TaskScheduler implements IRenderTaskExectutor {
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
    // group compare tasks
    this.abortAll((t) => t.id.startsWith(`r${ranking.id}:`));
  }

  private byOrder(indices: IndicesArray) {
    return lazySeq(indices).map(this.byIndex);
  }

  private byOrderAcc<T>(indices: IndicesArray, acc: (row: IDataRow) => T) {
    return lazySeq(indices).map((i) => acc(this.data[i]));
  }

  preCompute(ranking: Ranking, groups: {rows: IndicesArray, group: IGroup}[]) {
    if (groups.length === 0) {
      return;
    }
    const cols = ranking.flatColumns;
    if (groups.length === 1) {
      const {group, rows} = groups[0];
      const seq = this.byOrder(rows);
      for (const col of cols) {
        if (isCategoricalLikeColumn(col)) {
          this.summaryCategoricalStats(col, seq);
        } else if (isNumberColumn(col)) {
          this.summaryNumberStats(col, false, seq);
        } else if (isDateColumn(col)) {
          this.summaryDateStats(col, seq);
        } else {
          continue;
        }
        // copy from summary to group
        this.cache.set(`${col.id}:a:group:${group.name}`, this.cache.get(`${col.id}:b:summary`));
      }
      return;
    }

    const ogroups = groups.map(({rows, group}) => Object.assign({order: rows}, group));
    const full = concatSeq(groups.map((g) => lazySeq(g.rows))).map((d) => this.data[d]);
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
      // copy from data to summary
      this.cache.set(`${col.id}:b:summary`, this.cache.get(`${col.id}:c:data`));
    }
  }

  groupCompare(ranking: Ranking, group: IGroup, rows: ISequence<IDataRow>) {
    return taskLater(this.push(`r${ranking.id}:${group.name}`, () => ranking.toGroupCompareValue(rows, group)));
  }

  groupRows<T>(col: Column, group: IOrderedGroup, key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return this.cached(`${col.id}:a:group:${group.name}:${key}`, group.order.length === 0, () => compute(this.byOrder(group.order)));
  }

  groupExampleRows<T>(_col: Column, group: IOrderedGroup, _key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return taskNow(compute(this.byOrder(group.order.slice(0, 5))));
  }

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean, groupOrder?: ISequence<IDataRow>, order?: ISequence<IDataRow>) {
    return this.chain(`${col.id}:a:group:${group.name}${raw ? ':braw' : ':b'}`, this.summaryBoxPlotStats(col, raw, order), ({summary, data}) => {
      const acc = chooseAccNumber(col, raw);
      return {group: computeBoxPlot(groupOrder ? groupOrder.map(acc) : this.byOrderAcc(group.order, acc)), summary, data};
    });
  }

  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean, groupOrder?: ISequence<IDataRow>, order?: ISequence<IDataRow>) {
    return this.chain(`${col.id}:a:group:${group.name}${raw ? ':raw' : ''}`, this.summaryNumberStats(col, raw, order), ({summary, data}) => {
      const acc = chooseAccNumber(col, raw);
      return {group: computeNormalizedStats(groupOrder ? groupOrder.map(acc) : this.byOrderAcc(group.order, acc), summary.hist.length), summary, data};
    });
  }

  groupCategoricalStats(col: Column & ICategoricalLikeColumn, group: IOrderedGroup, groupOrder?: ISequence<IDataRow>, order?: ISequence<IDataRow>) {
    return this.chain(`${col.id}:a:group:${group.name}`, this.summaryCategoricalStats(col, order), ({summary, data}) => {
      const acc = chooseAccCategory(col);
      return {group: computeHist(groupOrder ? groupOrder.map(acc) : this.byOrderAcc(group.order, acc), col.categories), summary, data};
    });
  }

  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup, groupOrder?: ISequence<IDataRow>, order?: ISequence<IDataRow>) {
    return this.chain(`${col.id}:a:group:${group.name}`, this.summaryDateStats(col, order), ({summary, data}) => {
      const acc = chooseAccDate(col);
      return {group: computeDateStats(groupOrder ? groupOrder.map(acc) : this.byOrderAcc(group.order, acc), summary), summary, data};
    });
  }

  summaryBoxPlotStats(col: Column & INumberColumn, raw?: boolean, order?: ISequence<IDataRow>) {
    return this.chain(`${col.id}:b:summary${raw ? ':braw' : ':b'}`, this.dataBoxPlotStats(col, raw), (data) => {
      const acc = chooseAccNumber(col, raw);
      return {summary: computeBoxPlot(order ? order.map(acc) : this.byOrderAcc(col.findMyRanker()!.getOrder(), acc)), data};
    });
  }

  summaryNumberStats(col: Column & INumberColumn, raw?: boolean, order?: ISequence<IDataRow>) {
    return this.chain(`${col.id}:b:summary${raw ? ':raw' : ''}`, this.dataNumberStats(col, raw), (data) => {
      const acc = chooseAccNumber(col, raw);
      return {summary: computeNormalizedStats(order ? order.map(acc) : this.byOrderAcc(col.findMyRanker()!.getOrder(), acc), data.hist.length), data};
    });
  }

  summaryCategoricalStats(col: Column & ICategoricalLikeColumn, order?: ISequence<IDataRow>) {
    return this.chain(`${col.id}:b:summary`, this.dataCategoricalStats(col), (data) => {
      const acc = chooseAccCategory(col);
      return {summary: computeHist(order ? order.map(acc) : this.byOrderAcc(col.findMyRanker()!.getOrder(), acc), col.categories), data};
    });
  }

  summaryDateStats(col: Column & IDateColumn, order?: ISequence<IDataRow>) {
    return this.chain(`${col.id}:b:summary`, this.dataDateStats(col), (data) => {
      const acc = chooseAccDate(col);
      return {summary: computeDateStats(order ? order.map(acc) : this.byOrderAcc(col.findMyRanker()!.getOrder(), acc), data), data};
    });
  }

  private cached<T>(key: string, dontCache: boolean, creator: () => T): IRenderTask<T> {
    if (this.cache.has(key) && !dontCache) {
      return this.cache.get(key)!;
    }
    const task = this.push(key, creator);
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

  private chain<T, U>(key: string, task: IRenderTask<T>, creator: (data: T) => U): IRenderTask<U> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    if (task instanceof TaskNow) {
      return this.cached(key, false, () => creator(task.v));
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

  dataBoxPlotStats(col: Column & INumberColumn, raw?: boolean) {
    const acc = chooseAccNumber(col, raw);
    return this.cached(`${col.id}:c:data${raw ? ':braw' : ':b'}`, this.data.length === 0, () => computeBoxPlot(lazySeq(this.data).map(acc)));
  }

  dataNumberStats(col: Column & INumberColumn, raw?: boolean) {
    const acc = chooseAccNumber(col, raw);
    return this.cached(`${col.id}:c:data${raw ? ':raw' : ''}`, this.data.length === 0, () => computeNormalizedStats(lazySeq(this.data).map(acc)));
  }

  dataCategoricalStats(col: Column & ICategoricalLikeColumn) {
    const acc = chooseAccCategory(col);
    return this.cached(`${col.id}:c:data`, this.data.length === 0, () => computeHist(lazySeq(this.data).map(acc), col.categories));
  }

  dataDateStats(col: Column & IDateColumn) {
    const acc = chooseAccDate(col);
    return this.cached(`${col.id}:c:data`, this.data.length === 0, () => computeDateStats(lazySeq(this.data).map(acc)));
  }
}
