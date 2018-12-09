import {IStatistics, ICategoricalStatistics, IDateStatistics, IAdvancedBoxPlotData, dateStatsBuilder, normalizedStatsBuilder, categoricalStatsBuilder, boxplotBuilder, getNumberOfBins} from '../internal/math';
import {IDataRow, INumberColumn, IDateColumn, ISetColumn, IOrderedGroup, IndicesArray, Ranking, ICategoricalLikeColumn, IGroup, NumberColumn, OrdinalColumn, ImpositionCompositeColumn, CategoricalColumn, DateColumn, isCategoricalLikeColumn, isNumberColumn, isDateColumn} from '../model';
import Column, {ICompareValue} from '../model/Column';
import {ISequence, lazySeq, IForEachAble, isIndicesAble} from '../internal/interable';
import {IAbortAblePromise, ABORTED, abortAbleAll, abortAble} from 'lineupengine';
import TaskScheduler from '../internal/scheduler';

export {IAbortAblePromise} from 'lineupengine';

// TODO introduce value caches for individual colums, i.e. store
// number column -> data:IDataRow[] -> getNumber() => Float32Array
// categorical column -> data:IDataRow[] -> getCategory() => UInt8Array (0 == null, 1 = first category)
// date column -> data:IDataRow[] -> getDate() => Int32Array (-max = null)
// string column -> data:IDataRow[] -> getDate() => string[] (-max = null)
// keep updated and compute
// or transfer to the worker threads to compute the hists async and keep in sync
// also use the value cache for computing the comparevalue and groupcompareavalue

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
  preComputeCol(col: Column): void;
  preComputeData(ranking: Ranking): void;
  copyData2Summary(ranking: Ranking): void;
  copyCache(col: Column, from: Column): void;
}

class MultiIndices {
  constructor(public readonly indices: IndicesArray[]) {

  }
}

export class ARenderTasks {
  protected readonly byIndex = (i: number) => this.data[i];

  constructor(protected data: IDataRow[] = []) {

  }


  protected byOrder(indices: IndicesArray) {
    return lazySeq(indices).map(this.byIndex);
  }

  protected byOrderAcc<T>(indices: IndicesArray, acc: (row: IDataRow) => T) {
    return lazySeq(indices).map((i) => acc(this.data[i]));
  }

  private builder<T, B extends {push: (v: T) => void}>(builder: B, order: IndicesArray | null | MultiIndices, acc: (row: IDataRow) => T) {
    if (order == null) {
      for (const d of this.data) {
        builder.push(acc(d));
      }
    } else {
      const orders = order instanceof MultiIndices ? order.indices : [order];
      for (const o of orders) {
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < o.length; ++i) {
          builder.push(acc(this.data[o[i]]));
        }
      }
    }
    return builder;
  }

  private builderForEach<T, B extends {push: (v: T) => void}>(builder: B, order: IndicesArray | null | MultiIndices, acc: (row: IDataRow) => IForEachAble<T>) {
    const pushAll = (vs: IForEachAble<T>) => {
      if (!isIndicesAble(vs)) {
        vs.forEach(builder.push);
        return;
      }
      // tslint:disable-next-line:prefer-for-of
      for (let j = 0; j < vs.length; ++j) {
        builder.push(vs[j]);
      }
    };

    if (order == null) {
      for (const d of this.data) {
        pushAll(acc(d));
      }
    } else {
      const orders = order instanceof MultiIndices ? order.indices : [order];
      for (const o of orders) {
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < o.length; ++i) {
          pushAll(acc(this.data[o[i]]));
        }
      }
    }
    return builder;
  }

  protected boxplotBuilder(order: IndicesArray | null | MultiIndices, col: INumberColumn, raw?: boolean) {
    const b = boxplotBuilder();
    if (col instanceof NumberColumn || col instanceof OrdinalColumn || col instanceof ImpositionCompositeColumn) {
      return this.builder(b, order, <(row: IDataRow) => number>(raw ? col.getRawNumber.bind(col) : col.getNumber.bind(col))).build();
    }
    return this.builderForEach(b, order, <(row: IDataRow) => IForEachAble<number>>(raw ? col.iterRawNumber.bind(col) : col.iterNumber.bind(col))).build();
  }

  protected normalizedStatsBuilder(order: IndicesArray | null | MultiIndices, col: INumberColumn, numberOfBins: number, raw?: boolean) {
    const b = normalizedStatsBuilder(numberOfBins);
    if (col instanceof NumberColumn || col instanceof OrdinalColumn || col instanceof ImpositionCompositeColumn) {
      return this.builder(b, order, <(row: IDataRow) => number>(raw ? col.getRawNumber.bind(col) : col.getNumber.bind(col))).build();
    }
    return this.builderForEach(b, order, <(row: IDataRow) => IForEachAble<number>>(raw ? col.iterRawNumber.bind(col) : col.iterNumber.bind(col))).build();
  }

  protected dateStatsBuilder(order: IndicesArray | null | MultiIndices, col: IDateColumn, template?: IDateStatistics) {
    const b = dateStatsBuilder(template);
    if (col instanceof DateColumn) {
      return this.builder(b, order, (row: IDataRow) => col.getDate(row)).build();
    }
    return this.builderForEach(b, order, (row: IDataRow) => col.iterDate(row)).build();
  }

  protected categoricalStatsBuilder(order: IndicesArray | null | MultiIndices, col: ICategoricalLikeColumn) {
    const b = categoricalStatsBuilder(col.categories);
    if (col instanceof CategoricalColumn || col instanceof OrdinalColumn) {
      return this.builder(b, order, (row: IDataRow) => col.getCategory(row)).build();
    }
    return this.builderForEach(b, order, (row: IDataRow) => col.iterCategory(row)).build();
  }

}

export class DirectRenderTasks extends ARenderTasks implements IRenderTaskExectutor {

  protected readonly cache = new Map<string, any>();

  setData(data: IDataRow[]) {
    this.data = data;
    this.cache.clear();
  }


  dirtyColumn(col: Column, type: 'data' | 'summary' | 'group') {
    const prefix = type === 'group' ? 'summary' : type;
    this.cache.delete(`${col.id}:${prefix}`);
    this.cache.delete(`${col.id}:${prefix}:raw`);
    this.cache.delete(`${col.id}:${prefix}:b`);
    this.cache.delete(`${col.id}:${prefix}:braw`);
  }

  dirtyRanking(ranking: Ranking, type: 'data' | 'summary' | 'group') {
    for (const col of ranking.flatColumns) {
      this.dirtyColumn(col, type);
    }
  }

  preCompute() {
    // dummy
  }

  preComputeData() {
    // dummy
  }

  preComputeCol() {
    // dummy
  }

  copyData2Summary() {
    // dummy
  }

  copyCache(col: Column, from: Column) {
    const fromPrefix = `${from.id}:`;

    for (const key of Array.from(this.cache.keys()).sort()) {
      if (!key.startsWith(fromPrefix)) {
        continue;
      }
      const tkey = `${col.id}:${key.slice(fromPrefix.length)}`;
      this.cache.set(tkey, this.cache.get(key)!);
    }
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
    return taskNow({group: this.boxplotBuilder(group.order, col, raw), summary, data});
  }

  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    const {summary, data} = this.summaryNumberStatsD(col, raw);
    return taskNow({group: this.normalizedStatsBuilder(group.order, col, summary.hist.length, raw), summary, data});
  }

  groupCategoricalStats(col: Column & ISetColumn, group: IOrderedGroup) {
    const {summary, data} = this.summaryCategoricalStatsD(col);
    return taskNow({group: this.categoricalStatsBuilder(group.order, col), summary, data});
  }

  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup) {
    const {summary, data} = this.summaryDateStatsD(col);
    return taskNow({group: this.dateStatsBuilder(group.order, col, summary), summary, data});
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
    return this.cached('summary', col, () => {
      const ranking = col.findMyRanker()!.getOrder();
      const data = this.dataNumberStats(col, raw);
      return {summary: this.normalizedStatsBuilder(ranking, col, data.hist.length, raw), data};
    }, raw ? ':raw' : '');
  }

  private summaryBoxPlotStatsD(col: Column & INumberColumn, raw?: boolean) {
    return this.cached('summary', col, () => {
      const ranking = col.findMyRanker()!.getOrder();
      const data = this.dataBoxPlotStats(col, raw);
      return {summary: this.boxplotBuilder(ranking, col, raw), data};
    }, raw ? ':braw' : ':b');
  }

  private summaryCategoricalStatsD(col: Column & ISetColumn) {
    return this.cached('summary', col, () => {
      const ranking = col.findMyRanker()!.getOrder();
      const data = this.dataCategoricalStats(col);
      return {summary: this.categoricalStatsBuilder(ranking, col), data};
    });
  }

  private summaryDateStatsD(col: Column & IDateColumn) {
    return this.cached('summary', col, () => {
      const ranking = col.findMyRanker()!.getOrder();
      const data = this.dataDateStats(col);
      return {summary: this.dateStatsBuilder(ranking, col, data), data};
    });
  }

  private cached<T>(prefix: string, col: Column, creator: () => T, suffix: string = ''): T {
    const key = `${col.id}:${prefix}${suffix}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const s = creator();
    this.cache.set(key, s);
    return s;
  }

  dataBoxPlotStats(col: Column & INumberColumn, raw?: boolean) {
    return this.cached('data', col, () => this.boxplotBuilder(null, col, raw), raw ? ':braw' : ':b');
  }

  dataNumberStats(col: Column & INumberColumn, raw?: boolean) {
    return this.cached('data', col, () => this.normalizedStatsBuilder(null, col, getNumberOfBins(this.data.length), raw), raw ? ':raw' : '');
  }

  dataCategoricalStats(col: Column & ISetColumn) {
    return this.cached('data', col, () => this.categoricalStatsBuilder(null, col));
  }

  dataDateStats(col: Column & IDateColumn) {
    return this.cached('data', col, () => this.dateStatsBuilder(null, col));
  }

}


export class ScheduleRenderTasks extends ARenderTasks implements IRenderTaskExectutor {

  private readonly cache = new Map<string, IRenderTask<any>>();
  private readonly tasks = new TaskScheduler();

  setData(data: IDataRow[]) {
    this.data = data;
    this.cache.clear();
    this.tasks.clear();
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

  groupCompare(ranking: Ranking, group: IGroup, rows: ISequence<IDataRow>) {
    return taskLater(this.tasks.push(`r${ranking.id}:${group.name}`, () => ranking.toGroupCompareValue(rows, group)));
  }

  groupRows<T>(col: Column, group: IOrderedGroup, key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return this.cached(`${col.id}:a:group:${group.name}:${key}`, group.order.length === 0, () => compute(this.byOrder(group.order)));
  }

  groupExampleRows<T>(_col: Column, group: IOrderedGroup, _key: string, compute: (rows: ISequence<IDataRow>) => T) {
    return taskNow(compute(this.byOrder(group.order.slice(0, 5))));
  }

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    return this.chain(`${col.id}:a:group:${group.name}${raw ? ':braw' : ':b'}`, this.summaryBoxPlotStats(col, raw), ({summary, data}) => {
      return {group: this.boxplotBuilder(group.order, col, raw), summary, data};
    });
  }

  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    return this.chain(`${col.id}:a:group:${group.name}${raw ? ':raw' : ''}`, this.summaryNumberStats(col, raw), ({summary, data}) => {
      return {group: this.normalizedStatsBuilder(group.order, col, summary.hist.length, raw), summary, data};
    });
  }

  groupCategoricalStats(col: Column & ICategoricalLikeColumn, group: IOrderedGroup) {
    return this.chain(`${col.id}:a:group:${group.name}`, this.summaryCategoricalStats(col), ({summary, data}) => {
      return {group: this.categoricalStatsBuilder(group.order, col), summary, data};
    });
  }

  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup) {
    return this.chain(`${col.id}:a:group:${group.name}`, this.summaryDateStats(col), ({summary, data}) => {
      return {group: this.dateStatsBuilder(group.order, col, summary), summary, data};
    });
  }

  summaryBoxPlotStats(col: Column & INumberColumn, raw?: boolean, order?: MultiIndices) {
    return this.chain(`${col.id}:b:summary${raw ? ':braw' : ':b'}`, this.dataBoxPlotStats(col, raw), (data) => {
      return {summary: this.boxplotBuilder(order ? order : col.findMyRanker()!.getOrder(), col, raw), data};
    });
  }

  summaryNumberStats(col: Column & INumberColumn, raw?: boolean, order?: MultiIndices) {
    return this.chain(`${col.id}:b:summary${raw ? ':raw' : ''}`, this.dataNumberStats(col, raw), (data) => {
      return {summary: this.normalizedStatsBuilder(order ? order : col.findMyRanker()!.getOrder(), col, data.hist.length, raw), data};
    });
  }

  summaryCategoricalStats(col: Column & ICategoricalLikeColumn, order?: MultiIndices) {
    return this.chain(`${col.id}:b:summary`, this.dataCategoricalStats(col), (data) => {
      return {summary: this.categoricalStatsBuilder(order ? order : col.findMyRanker()!.getOrder(), col), data};
    });
  }

  summaryDateStats(col: Column & IDateColumn, order?: MultiIndices) {
    return this.chain(`${col.id}:b:summary`, this.dataDateStats(col), (data) => {
      return {summary: this.dateStatsBuilder(order ? order : col.findMyRanker()!.getOrder(), col, data), data};
    });
  }

  private cached<T>(key: string, dontCache: boolean, creator: () => T): IRenderTask<T> {
    if (this.cache.has(key) && !dontCache) {
      return this.cache.get(key)!;
    }

    // TODO support that the builder of stats is split up in multiple chunks depending to timeRemaining

    const task = this.tasks.push(key, creator);
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
      return this.tasks.push(key, () => creator(data));
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
    return this.cached(`${col.id}:c:data${raw ? ':braw' : ':b'}`, this.data.length === 0, () => this.boxplotBuilder(null, col, raw));
  }

  dataNumberStats(col: Column & INumberColumn, raw?: boolean) {
    return this.cached(`${col.id}:c:data${raw ? ':raw' : ''}`, this.data.length === 0, () => this.normalizedStatsBuilder(null, col, getNumberOfBins(this.data.length), raw));
  }

  dataCategoricalStats(col: Column & ICategoricalLikeColumn) {
    return this.cached(`${col.id}:c:data`, this.data.length === 0, () => this.categoricalStatsBuilder(null, col));
  }

  dataDateStats(col: Column & IDateColumn) {
    return this.cached(`${col.id}:c:data`, this.data.length === 0, () => this.dateStatsBuilder(null, col));
  }
}
