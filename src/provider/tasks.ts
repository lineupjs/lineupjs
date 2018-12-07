import {IStatistics, ICategoricalStatistics, IDateStatistics, IAdvancedBoxPlotData, computeDateStats, computeNormalizedStats, computeHist, LazyBoxPlotData} from '../internal/math';
import {IDataRow, INumberColumn, IDateColumn, ISetColumn, IOrderedGroup, IndicesArray} from '../model';
import Column from '../model/Column';
import {ISequence, lazySeq} from '../internal/interable';
import {IAbortAblePromise, abortAbleResolveNow} from 'lineupengine';

export {IAbortAblePromise} from 'lineupengine';

export interface ITask<T> {
  then<U = void>(onfullfilled: (value: T) => U): U | IAbortAblePromise<U>;
}

class TaskNow<T> implements ITask<T> {
  constructor(public readonly v: T) {

  }

  then<U = void>(onfullfilled: (value: T) => U) {
    return onfullfilled(this.v);
  }
}

function taskNow<T>(v: T) {
  return new TaskNow(v);
}

export function tasksAll<T>(tasks: ITask<T>[]): ITask<T[]> {
  if (tasks.every((t) => t instanceof TaskNow)) {
    return taskNow(tasks.map((d) => (<TaskNow<T>>d).v));
  }
  return taskNow([]); // FIXME
}

export interface IRenderTasks {
  groupRows<T>(col: Column, group: IOrderedGroup, compute: (rows: ISequence<IDataRow>) => T): ITask<T>;
  groupExampleRows<T>(col: Column, group: IOrderedGroup, compute: (rows: ISequence<IDataRow>) => T): ITask<T>;

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup): ITask<{group: IAdvancedBoxPlotData, summary: IAdvancedBoxPlotData, data: IAdvancedBoxPlotData}>;
  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup): ITask<{group: IStatistics, summary: IStatistics, data: IStatistics}>;
  groupCategoricalStats(col: Column & ISetColumn, group: IOrderedGroup): ITask<{group: ICategoricalStatistics, summary: ICategoricalStatistics, data: ICategoricalStatistics}>;
  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup): ITask<{group: IDateStatistics, summary: IDateStatistics, data: IDateStatistics}>;

  summaryBoxPlotStats(col: Column & INumberColumn): ITask<{summary: IAdvancedBoxPlotData, data: IAdvancedBoxPlotData}>;
  summaryNumberStats(col: Column & INumberColumn): ITask<{summary: IStatistics, data: IStatistics}>;
  summaryCategoricalStats(col: Column & ISetColumn): ITask<{summary: ICategoricalStatistics, data: ICategoricalStatistics}>;
  summaryDateStats(col: Column & IDateColumn): ITask<{summary: IDateStatistics, data: IDateStatistics}>;
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
  }

  private byOrder(indices: IndicesArray) {
    return lazySeq(indices).map(this.byIndex);
  }

  groupRows<T>(_col: Column, group: IOrderedGroup, compute: (rows: ISequence<IDataRow>) => T) {
    return taskNow(compute(this.byOrder(group.order)));
  }

  groupExampleRows<T>(_col: Column, group: IOrderedGroup, compute: (rows: ISequence<IDataRow>) => T) {
    return taskNow(compute(this.byOrder(group.order.slice(0, 5))));
  }

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup) {
    return this.groupNumberStats(col, group);
  }

  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup) {
    const {summary, data} = this.summaryNumberStatsD(col);
    return taskNow({group: computeNormalizedStats(this.byOrder(group.order).map((d) => col.getNumber(d))), summary, data});
  }

  groupCategoricalStats(col: Column & ISetColumn, group: IOrderedGroup) {
    const {summary, data} = this.summaryCategoricalStatsD(col);
    return taskNow({group: computeHist(this.byOrder(group.order).map((d) => col.getSet(d)), col.categories), summary, data});
  }

  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup) {
    const {summary, data} = this.summaryDateStatsD(col);
    return taskNow({group: computeDateStats(this.byOrder(group.order).map((d) => col.getDate(d)), summary), summary, data});
  }

  summaryBoxPlotStats(col: Column & INumberColumn) {
    return this.summaryNumberStats(col);
  }

  summaryNumberStats(col: Column & INumberColumn) {
    return taskNow(this.summaryNumberStatsD(col));
  }

  summaryCategoricalStats(col: Column & ISetColumn) {
    return taskNow(this.summaryCategoricalStatsD(col));
  }

  summaryDateStats(col: Column & IDateColumn) {
    return taskNow(this.summaryDateStatsD(col));
  }

  private summaryNumberStatsD(col: Column & INumberColumn) {
    const ranking = col.findMyRanker()!.getOrder();
    const data = this.dataNumberStats(col);
    return {summary: computeNormalizedStats(this.byOrder(ranking).map((d) => col.getNumber(d)), data.hist.length), data};
  }

  private summaryCategoricalStatsD(col: Column & ISetColumn) {
    const ranking = col.findMyRanker()!.getOrder();
    const data = this.dataCategoricalStats(col);
    return {summary: computeHist(this.byOrder(ranking).map((d) => col.getSet(d)), col.categories), data};
  }

  private summaryDateStatsD(col: Column & IDateColumn) {
    const ranking = col.findMyRanker()!.getOrder();
    const data = this.dataDateStats(col);
    return {summary: computeDateStats(this.byOrder(ranking).map((d) => col.getDate(d)), data), data};
  }

  dataBoxPlotStats(col: Column & INumberColumn) {
    this.dataNumberStats(col);
  }

  private cached<T>(col: Column, creator: () => T) {
    if (this.dataCache.has(col.id)) {
      return this.dataCache.get(col.id)!;
    }
    const s = creator();
    this.dataCache.set(col.id, s);
    return s;
  }

  dataNumberStats(col: Column & INumberColumn) {
    return this.cached(col, () => computeNormalizedStats(lazySeq(this.data).map((d) => col.getNumber(d))));
  }

  dataCategoricalStats(col: Column & ISetColumn) {
    return this.cached(col, () => computeHist(lazySeq(this.data).map((d) => col.getSet(d)), col.categories));
  }

  dataDateStats(col: Column & IDateColumn) {
    return this.cached(col, () => computeDateStats(lazySeq(this.data).map((d) => col.getDate(d))));
  }

}