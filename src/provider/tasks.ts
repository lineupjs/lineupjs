import {abortAble, abortAbleAll, IAbortAblePromise} from 'lineupengine';
import {IForEachAble, lazySeq} from '../internal/interable';
import {boxplotBuilder, categoricalStatsBuilder, categoricalValueCacheBuilder, dateStatsBuilder, dateValueCacheBuilder, IAdvancedBoxPlotData, ICategoricalStatistics, IDateStatistics, IStatistics, normalizedStatsBuilder, dateValueCache2Value, categoricalValueCache2Value} from '../internal/math';
import {ANOTHER_ROUND} from '../internal/scheduler';
import {CategoricalColumn, DateColumn, ICategoricalLikeColumn, IDataRow, IDateColumn, IGroup, ImpositionCompositeColumn, IndicesArray, INumberColumn, NumberColumn, OrdinalColumn, Ranking, UIntTypedArray, ICategory} from '../model';
import Column, {ICompareValue} from '../model/Column';
import {IRenderTask, IRenderTasks} from '../renderer/interfaces';
import {CompareLookup} from './sort';

export {IAbortAblePromise} from 'lineupengine';

// TODO introduce value caches for individual colums, i.e. store
// number column -> data:IDataRow[] -> getNumber() => Float32Array
// categorical column -> data:IDataRow[] -> getCategory() => UInt8Array (0 == null, 1 = first category)
// date column -> data:IDataRow[] -> getDate() => Int32Array (-max = null)
// string column -> data:IDataRow[] -> getDate() => string[] (-max = null)
// keep updated and compute
// or transfer to the worker threads to compute the hists async and keep in sync
// also use the value cache for computing the comparevalue and groupcompareavalue

/**
 * @internal
 */
export class TaskNow<T> implements IRenderTask<T> {
  constructor(public readonly v: T) {

  }

  then<U = void>(onfullfilled: (value: T) => U) {
    return onfullfilled(this.v);
  }
}

/**
 * @internal
 */
export function taskNow<T>(v: T) {
  return new TaskNow(v);
}

/**
 * @internal
 */
export class TaskLater<T> implements IRenderTask<T> {
  constructor(public readonly v: IAbortAblePromise<T>) {

  }

  then<U = void>(onfullfilled: (value: T | symbol) => U) {
    // wrap to avoid that the task will be aborted
    return abortAble(this.v).then(onfullfilled);
  }
}

/**
 * @internal
 */
export function taskLater<T>(v: IAbortAblePromise<T>) {
  return new TaskLater(v);
}

export function tasksAll<T>(tasks: IRenderTask<T>[]): IRenderTask<T[]> {
  if (tasks.every((t) => t instanceof TaskNow)) {
    return taskNow(tasks.map((d) => (<TaskNow<T>>d).v));
  }
  return taskLater(abortAbleAll((<(TaskNow<T> | TaskLater<T>)[]>tasks).map((d) => d.v)));
}



export interface IRenderTaskExectutor extends IRenderTasks {
  setData(data: IDataRow[]): void;
  dirtyColumn(col: Column, type: 'data' | 'summary' | 'group'): void;
  dirtyRanking(ranking: Ranking, type: 'data' | 'summary' | 'group'): void;

  groupCompare(ranking: Ranking, group: IGroup, rows: IndicesArray): IRenderTask<ICompareValue[]>;

  preCompute(ranking: Ranking, groups: {rows: IndicesArray, group: IGroup}[]): void;
  preComputeCol(col: Column): void;
  preComputeData(ranking: Ranking): void;
  copyData2Summary(ranking: Ranking): void;
  copyCache(col: Column, from: Column): void;

  sort(ranking: Ranking, group: IGroup, indices: IndicesArray, singleCall: boolean, lookups?: CompareLookup): Promise<IndicesArray>;
  terminate(): void;

  valueCache(col: Column): undefined | ((dataIndex: number) => any);
}

/**
 * @internal
 */
export class MultiIndices {
  constructor(public readonly indices: IndicesArray[]) {

  }
}

const CHUNK_SIZE = 100;

/**
 * @internal
 */
export class ARenderTasks {
  protected readonly valueCacheData = new Map<string, Float32Array | UIntTypedArray | Int32Array>();

  protected readonly byIndex = (i: number) => this.data[i];

  constructor(protected data: IDataRow[] = []) {

  }


  protected byOrder(indices: IndicesArray) {
    return lazySeq(indices).map(this.byIndex);
  }

  protected byOrderAcc<T>(indices: IndicesArray, acc: (row: IDataRow) => T) {
    return lazySeq(indices).map((i) => acc(this.data[i]));
  }

  private builder<T, BR, B extends {push: (v: T) => void, build: () => BR}, R = BR>(builder: B, order: IndicesArray | null | MultiIndices, acc: (dataIndex: number) => T, build?: (r: BR) => R): Iterator<R | null> {
    let i = 0;
    let o = 0;
    const orders = order instanceof MultiIndices ? order.indices : [order];

    const nextData = (currentChunkSize: number = CHUNK_SIZE) => {
      let chunkCounter = currentChunkSize;
      const data = this.data;
      for (; i < data.length && chunkCounter > 0; ++i, --chunkCounter) {
        builder.push(acc(i));
      }
      if (i < data.length) { // need another round
        return ANOTHER_ROUND;
      }
      // done
      return {
        done: true,
        value: build ? build(builder.build()) : <R><unknown>builder.build()
      };
    };

    const nextOrder = (currentChunkSize: number = CHUNK_SIZE) => {
      let chunkCounter = currentChunkSize;
      while (o < orders.length) {
        const actOrder = orders[o]!;
        for (; i < actOrder.length && chunkCounter > 0; ++i, --chunkCounter) {
          builder.push(acc(actOrder[i]));
        }
        if (i < actOrder.length) { // need another round
          return ANOTHER_ROUND;
        }
        // done with this order
        o++;
        i = 0;
      }
      return {
        done: true,
        value: build ? build(builder.build()) : <R><unknown>builder.build()
      };
    };
    return {next: order == null ? nextData : nextOrder};
  }

  private builderForEach<T, BR, B extends {pushAll: (v: IForEachAble<T>) => void, build: () => BR}, R = BR>(builder: B, order: IndicesArray | null | MultiIndices, acc: (dataIndex: number) => IForEachAble<T>, build?: (r: BR) => R): Iterator<R | null> {
    return this.builder({
      push: builder.pushAll,
      build: builder.build
    }, order, acc, build);
  }

  protected boxplotBuilder<R = IAdvancedBoxPlotData>(order: IndicesArray | null | MultiIndices, col: INumberColumn, raw?: boolean, build?: (stat: IAdvancedBoxPlotData) => R) {
    const b = boxplotBuilder();
    if (col instanceof NumberColumn || col instanceof OrdinalColumn || col instanceof ImpositionCompositeColumn) {
      // TODO compute async
      const cache = !raw ? this.valueCacheData.get(col.id) : undefined;
      const acc: (i: number) => number = cache ? (i) => cache[i] : (raw ? (i) => col.getRawNumber(this.data[i]) : (i) => col.getNumber(this.data[i]));
      return this.builder(b, order, acc, build);
    }
    const acc: (i: number) => IForEachAble<number> = raw ? (i) => col.iterRawNumber(this.data[i]) : (i) => col.iterNumber(this.data[i]);
    return this.builderForEach(b, order, acc, build);
  }

  protected normalizedStatsBuilder<R = IStatistics>(order: IndicesArray | null | MultiIndices, col: INumberColumn, numberOfBins: number, raw?: boolean, build?: (stat: IStatistics) => R) {
    const b = normalizedStatsBuilder(numberOfBins);
    if (col instanceof NumberColumn || col instanceof OrdinalColumn || col instanceof ImpositionCompositeColumn) {
      if (order == null && !raw) {
        // build and valueCache
        const vs = new Float32Array(this.data.length);
        let i = 0;
        return this.builder({
          push: (v) => {
            b.push(v);
            vs[i++] = v;
          },
          build: () => {
            this.setValueCacheData(col.id, vs);
            return b.build();
          }
        }, null, (i: number) => col.getNumber(this.data[i]), build);
      }
      const cache = !raw ? this.valueCacheData.get(col.id) : undefined;
      const acc: (i: number) => number = cache ? (i) => cache[i] : (raw ? (i) => col.getRawNumber(this.data[i]) : (i) => col.getNumber(this.data[i]));
      return this.builder(b, order, acc, build);
    }
    const acc: (i: number) => IForEachAble<number> = raw ? (i) => col.iterRawNumber(this.data[i]) : (i) => col.iterNumber(this.data[i]);
    return this.builderForEach(b, order, acc, build);
  }

  protected dateStatsBuilder<R = IDateStatistics>(order: IndicesArray | null | MultiIndices, col: IDateColumn, template?: IDateStatistics, build?: (stat: IDateStatistics) => R) {
    const b = dateStatsBuilder(template);
    if (col instanceof DateColumn) {
      if (order == null) {
        // build and valueCache
        const vs = dateValueCacheBuilder(this.data.length);
        return this.builder({
          push: (v) => {
            b.push(v);
            vs.push(v);
          },
          build: () => {
            this.setValueCacheData(col.id, vs.cache);
            return b.build();
          }
        }, null, (i: number) => col.getDate(this.data[i]), build);
      }
      const cache = this.valueCacheData.get(col.id);
      const acc: (i: number) => Date | null = cache ? (i) => dateValueCache2Value(cache[i]) : (i) => col.getDate(this.data[i]);
      return this.builder(b, order, acc, build);
    }
    return this.builderForEach(b, order, (i: number) => col.iterDate(this.data[i]), build);
  }

  protected categoricalStatsBuilder<R = ICategoricalStatistics>(order: IndicesArray | null | MultiIndices, col: ICategoricalLikeColumn, build?: (stat: ICategoricalStatistics) => R) {
    const b = categoricalStatsBuilder(col.categories);
    if (col instanceof CategoricalColumn || col instanceof OrdinalColumn) {
      if (order == null) {
        // build and valueCache
        const vs = categoricalValueCacheBuilder(this.data.length, col.categories);
        return this.builder({
          push: (v) => {
            b.push(v);
            vs.push(v);
          },
          build: () => {
            this.setValueCacheData(col.id, vs.cache);
            return b.build();
          }
        }, null, (i: number) => col.getCategory(this.data[i]), build);
      }
      const cache = this.valueCacheData.get(col.id);
      const acc: (i: number) => ICategory | null = cache ? (i) => categoricalValueCache2Value(cache[i], col.categories) : (i) => col.getCategory(this.data[i]);
      return this.builder(b, order, acc, build);
    }
    return this.builderForEach(b, order, (i: number) => col.iterCategory(this.data[i]), build);
  }


  protected setValueCacheData(key: string, value: Float32Array | UIntTypedArray | Int32Array | null) {
    if (value == null) {
      this.valueCacheData.delete(key);
    } else {
      this.valueCacheData.set(key, value);
    }
  }
}
