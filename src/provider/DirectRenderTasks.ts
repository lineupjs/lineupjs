import { abortAbleAll, IAbortAblePromise } from 'lineupengine';
import {
  boxplotBuilder,
  categoricalStatsBuilder,
  categoricalValueCache2Value,
  categoricalValueCacheBuilder,
  dateStatsBuilder,
  dateValueCache2Value,
  dateValueCacheBuilder,
  getNumberOfBins,
  IAdvancedBoxPlotData,
  IBuilder,
  ICategoricalStatistics,
  IDateStatistics,
  IForEachAble,
  ISequence,
  IStatistics,
  IStringStatistics,
  joinIndexArrays,
  lazySeq,
  numberStatsBuilder,
  sortComplex,
  stringStatsBuilder,
  toIndexArray,
} from '../internal';
import type Column from '../model';
import type {
  ICategoricalLikeColumn,
  ICompareValue,
  IDataRow,
  IDateColumn,
  IGroup,
  IndicesArray,
  INumberColumn,
  IOrderedGroup,
  Ranking,
  StringColumn,
} from '../model';
import {
  CategoricalColumn,
  DateColumn,
  ICategory,
  ImpositionCompositeColumn,
  isMapAbleColumn,
  NumberColumn,
  OrdinalColumn,
  UIntTypedArray,
} from '../model';
import type { IRenderTask } from '../renderer';
import type { CompareLookup } from './sort';

/**
 * iterator result for another round
 * @internal
 */
export const ANOTHER_ROUND = {
  value: null,
  done: false,
};

/**
 * a render task that is already resolved
 */
export class TaskNow<T> implements IRenderTask<T> {
  constructor(public readonly v: T) {}

  then<U = void>(onfullfilled: (value: T) => U) {
    return onfullfilled(this.v);
  }
}

/**
 * factory function for
 */
export function taskNow<T>(v: T) {
  return new TaskNow(v);
}

/**
 * a render task based on an abortable promise
 */
export class TaskLater<T> implements IRenderTask<T> {
  constructor(public readonly v: IAbortAblePromise<T>) {}

  then<U = void>(onfullfilled: (value: T | symbol) => U): IAbortAblePromise<U> {
    return this.v.then(onfullfilled);
  }
}

export function taskLater<T>(v: IAbortAblePromise<T>) {
  return new TaskLater(v);
}

/**
 * similar to Promise.all
 */
export function tasksAll<T>(tasks: IRenderTask<T>[]): IRenderTask<T[]> {
  if (tasks.every((t) => t instanceof TaskNow)) {
    return taskNow(tasks.map((d) => (d as TaskNow<T>).v));
  }
  return taskLater(abortAbleAll((tasks as (TaskNow<T> | TaskLater<T>)[]).map((d) => d.v)));
}

export class MultiIndices {
  private _joined: IndicesArray | null = null;

  constructor(public readonly indices: IndicesArray[], private readonly maxDataIndex: number) {}

  get joined() {
    if (this.indices.length === 1) {
      return this.indices[0];
    }
    if (this.indices.length === 0) {
      return new Uint8Array(0);
    }
    if (this._joined) {
      return this._joined;
    }
    return (this._joined = joinIndexArrays(this.indices, this.maxDataIndex));
  }
}

export interface RenderTaskOptions {
  stringTopNCount: number | readonly string[];
}

/**
 * @internal
 */
export function sortDirect(indices: IndicesArray, maxDataIndex: number, lookups?: CompareLookup) {
  const order = toIndexArray(indices, maxDataIndex);
  if (lookups) {
    sortComplex(order, lookups.sortOrders);
  }
  return order;
}

/**
 * @internal
 */
export class DirectRenderTasks {
  protected readonly cache = new Map<string, any>();

  protected readonly valueCacheData = new Map<
    string,
    Float32Array | UIntTypedArray | Int32Array | Float64Array | readonly string[]
  >();

  protected readonly byIndex = (i: number) => this.data[i];

  protected readonly options: RenderTaskOptions;
  protected data: IDataRow[] = [];

  constructor(options: Partial<RenderTaskOptions> = {}) {
    this.options = Object.assign(
      {
        stringTopNCount: 10,
      },
      options
    );
  }

  protected byOrder(indices: IndicesArray): ISequence<IDataRow> {
    return lazySeq(indices).map(this.byIndex);
  }

  protected byOrderAcc<T>(indices: IndicesArray, acc: (row: IDataRow) => T) {
    return lazySeq(indices).map((i) => acc(this.data[i]));
  }

  /**
   * builder factory to create an iterator that can be used to schedule
   * @param builder the builder to use
   * @param order the order to iterate over
   * @param acc the accessor to get the value out of the data
   * @param build optional build mapper
   */
  private builder<T, BR, B extends { push: (v: T) => void; build: () => BR }, R = BR>(
    builder: B,
    order: IndicesArray | null | MultiIndices,
    acc: (dataIndex: number) => T,
    build?: (r: BR) => R
  ) {
    // no indices given over the whole data
    if (order == null) {
      const data = this.data;
      for (let i = 0; i < data.length; ++i) {
        builder.push(acc(i));
      }
      return build ? build(builder.build()) : (builder.build() as unknown as R);
    }

    const orders = order instanceof MultiIndices ? order.indices : [order];
    for (const actOrder of orders) {
      for (let i = 0; i < actOrder.length; ++i) {
        builder.push(acc(actOrder[i]));
      }
    }
    return build ? build(builder.build()) : (builder.build() as unknown as R);
  }

  private builderForEach<T, BR, B extends { pushAll: (v: IForEachAble<T>) => void; build: () => BR }, R = BR>(
    builder: B,
    order: IndicesArray | null | MultiIndices,
    acc: (dataIndex: number) => IForEachAble<T>,
    build?: (r: BR) => R
  ) {
    return this.builder(
      {
        push: builder.pushAll,
        build: builder.build,
      },
      order,
      acc,
      build
    );
  }

  protected boxplotBuilder<R = IAdvancedBoxPlotData>(
    order: IndicesArray | null | MultiIndices,
    col: INumberColumn,
    raw?: boolean,
    build?: (stat: IAdvancedBoxPlotData) => R
  ) {
    const b = boxplotBuilder();
    return this.numberStatsBuilder(b, order, col, raw, build);
  }

  protected resolveDomain(col: INumberColumn, raw: boolean): [number, number] {
    const domain = raw && isMapAbleColumn(col) ? col.getMapping().domain : [0, 1];
    return [domain[0], domain[domain.length - 1]];
  }

  protected statsBuilder<R = IStatistics>(
    order: IndicesArray | null | MultiIndices,
    col: INumberColumn,
    numberOfBins: number,
    raw?: boolean,
    build?: (stat: IStatistics) => R
  ) {
    const b = numberStatsBuilder(this.resolveDomain(col, raw ?? false), numberOfBins);
    return this.numberStatsBuilder(b, order, col, raw, build);
  }

  private numberStatsBuilder<R, B extends IBuilder<number, BR>, BR>(
    b: B,
    order: IndicesArray | null | MultiIndices,
    col: INumberColumn,
    raw?: boolean,
    build?: (stat: BR) => R
  ) {
    if (col instanceof NumberColumn || col instanceof OrdinalColumn || col instanceof ImpositionCompositeColumn) {
      const key = raw ? `${col.id}:r` : col.id;
      const dacc: (i: number) => number = raw
        ? (i) => col.getRawNumber(this.data[i])
        : (i) => col.getNumber(this.data[i]);

      if (order == null && !this.valueCacheData.has(key)) {
        // build and valueCache
        const vs = new Float32Array(this.data.length);
        let i = 0;
        return this.builder(
          {
            push: (v) => {
              b.push(v);
              vs[i++] = v;
            },
            build: () => {
              this.setValueCacheData(key, vs);
              return b.build();
            },
          },
          null,
          dacc,
          build
        );
      }

      const cache = this.valueCacheData.get(key) as UIntTypedArray;
      const acc: (i: number) => number = cache ? (i) => cache[i] : dacc;
      return this.builder(b, order, acc, build);
    }
    const acc: (i: number) => IForEachAble<number> = raw
      ? (i) => col.iterRawNumber(this.data[i])
      : (i) => col.iterNumber(this.data[i]);
    return this.builderForEach(b, order, acc, build);
  }

  protected dateStatsBuilder<R = IDateStatistics>(
    order: IndicesArray | null | MultiIndices,
    col: IDateColumn,
    template?: IDateStatistics,
    build?: (stat: IDateStatistics) => R
  ) {
    const b = dateStatsBuilder(template);
    if (col instanceof DateColumn) {
      if (order == null) {
        // build and valueCache
        const vs = dateValueCacheBuilder(this.data.length);
        return this.builder(
          {
            push: (v) => {
              b.push(v);
              vs.push(v);
            },
            build: () => {
              this.setValueCacheData(col.id, vs.cache);
              return b.build();
            },
          },
          null,
          (i: number) => col.getDate(this.data[i]),
          build
        );
      }
      const cache = this.valueCacheData.get(col.id) as UIntTypedArray;
      const acc: (i: number) => Date | null = cache
        ? (i) => dateValueCache2Value(cache[i])
        : (i) => col.getDate(this.data[i]);
      return this.builder(b, order, acc, build);
    }
    return this.builderForEach(b, order, (i: number) => col.iterDate(this.data[i]), build);
  }

  protected categoricalStatsBuilder<R = ICategoricalStatistics>(
    order: IndicesArray | null | MultiIndices,
    col: ICategoricalLikeColumn,
    build?: (stat: ICategoricalStatistics) => R
  ) {
    const b = categoricalStatsBuilder(col.categories);
    if (col instanceof CategoricalColumn || col instanceof OrdinalColumn) {
      if (order == null) {
        // build and valueCache
        const vs = categoricalValueCacheBuilder(this.data.length, col.categories);
        return this.builder(
          {
            push: (v) => {
              b.push(v);
              vs.push(v);
            },
            build: () => {
              this.setValueCacheData(col.id, vs.cache);
              return b.build();
            },
          },
          null,
          (i: number) => col.getCategory(this.data[i]),
          build
        );
      }
      const cache = this.valueCacheData.get(col.id) as UIntTypedArray;
      const acc: (i: number) => ICategory | null = cache
        ? (i) => categoricalValueCache2Value(cache[i], col.categories)
        : (i) => col.getCategory(this.data[i]);
      return this.builder(b, order, acc, build);
    }
    return this.builderForEach(b, order, (i: number) => col.iterCategory(this.data[i]), build);
  }

  protected stringStatsBuilder<R = IStringStatistics>(
    order: IndicesArray | null | MultiIndices,
    col: StringColumn,
    topN?: number | readonly string[],
    build?: (stat: IStringStatistics) => R
  ) {
    const b = stringStatsBuilder(topN ?? this.options.stringTopNCount);
    if (order == null) {
      // build and valueCache
      let i = 0;
      const vs: string[] = Array(this.data.length).fill(null);
      return this.builder(
        {
          push: (v) => {
            b.push(v);
            vs[i++] = v;
          },
          build: () => {
            this.setValueCacheData(col.id, vs);
            return b.build();
          },
        },
        null,
        (i: number) => col.getValue(this.data[i]),
        build
      );
    }
    return this.builder(b, order, (i: number) => col.getValue(this.data[i]), build);
  }

  dirtyColumn(col: Column, type: 'data' | 'summary' | 'group') {
    if (type === 'data') {
      this.valueCacheData.delete(col.id);
      this.valueCacheData.delete(`${col.id}:r`);
    }

    if (type === 'group') {
      return; // not cached
    }
    this.cache.delete(`${col.id}:summary`);
    this.cache.delete(`${col.id}:summary:raw`);
    this.cache.delete(`${col.id}:summary:b`);
    this.cache.delete(`${col.id}:summary:braw`);

    if (type === 'summary') {
      return;
    }
    this.cache.delete(`${col.id}:data`);
    this.cache.delete(`${col.id}:data:raw`);
    this.cache.delete(`${col.id}:data:b`);
    this.cache.delete(`${col.id}:data:braw`);
  }

  protected setValueCacheData(
    key: string,
    value: Float32Array | UIntTypedArray | Int32Array | Float64Array | readonly string[] | null
  ) {
    if (value == null) {
      this.valueCacheData.delete(key);
    } else {
      this.valueCacheData.set(key, value);
    }
  }

  valueCache(col: Column) {
    const v = this.valueCacheData.get(col.id);
    if (!v) {
      return undefined;
    }
    if (col instanceof DateColumn) {
      return (dataIndex: number) => dateValueCache2Value(v[dataIndex] as number);
    }
    if (col instanceof CategoricalColumn || col instanceof OrdinalColumn) {
      return (dataIndex: number) => categoricalValueCache2Value(v[dataIndex] as number, col.categories);
    }
    return (dataIndex: number) => v[dataIndex];
  }

  setData(data: IDataRow[]) {
    this.data = data;
    this.cache.clear();
    this.valueCacheData.clear();
  }

  dirtyRanking(ranking: Ranking, type: 'data' | 'summary' | 'group') {
    for (const col of ranking.flatColumns) {
      this.dirtyColumn(col, type);
    }
  }

  copyCache(col: Column, from: Column) {
    const fromPrefix = `${from.id}:`;

    for (const key of Array.from(this.cache.keys()).sort()) {
      if (!key.startsWith(fromPrefix)) {
        continue;
      }
      const cacheKey = `${col.id}:${key.slice(fromPrefix.length)}`;
      this.cache.set(cacheKey, this.cache.get(key)!);
    }
  }

  sort(
    _ranking: Ranking,
    _group: IGroup,
    indices: IndicesArray,
    _singleCall: boolean,
    maxDataIndex: number,
    lookups?: CompareLookup
  ) {
    return Promise.resolve(sortDirect(indices, maxDataIndex, lookups));
  }

  groupCompare(ranking: Ranking, group: IGroup, rows: IndicesArray): IRenderTask<ICompareValue[]> {
    const rg = ranking.getGroupSortCriteria();
    if (rg.length === 0) {
      return taskNow([group.name.toLowerCase()]);
    }
    const o = this.byOrder(rows);
    const vs: ICompareValue[] = [];
    for (const s of rg) {
      const r = s.col.toCompareGroupValue(o, group);
      if (Array.isArray(r)) {
        vs.push(...r);
      } else {
        vs.push(r);
      }
    }
    vs.push(group.name.toLowerCase());
    return taskNow(vs);
  }

  groupRows<T>(
    _col: Column,
    group: IOrderedGroup,
    _key: string,
    compute: (rows: ISequence<IDataRow>) => T
  ): IRenderTask<T> {
    return taskNow(compute(this.byOrder(group.order)));
  }

  groupExampleRows<T>(
    _col: Column,
    group: IOrderedGroup,
    _key: string,
    compute: (rows: ISequence<IDataRow>) => T
  ): IRenderTask<T> {
    return taskNow(compute(this.byOrder(group.order.slice(0, 5))));
  }

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    const { summary, data } = this.summaryBoxPlotStatsD(col, raw);
    return taskNow({
      group: this.boxplotBuilder(group.order, col, raw),
      summary,
      data,
    });
  }

  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, raw?: boolean) {
    const { summary, data } = this.summaryNumberStatsD(col, raw);
    return taskNow({
      group: this.statsBuilder(group.order, col, summary.hist.length, raw),
      summary,
      data,
    });
  }

  groupCategoricalStats(col: Column & ICategoricalLikeColumn, group: IOrderedGroup) {
    const { summary, data } = this.summaryCategoricalStatsD(col);
    return taskNow({
      group: this.categoricalStatsBuilder(group.order, col),
      summary,
      data,
    });
  }

  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup) {
    const { summary, data } = this.summaryDateStatsD(col);
    return taskNow({
      group: this.dateStatsBuilder(group.order, col, summary),
      summary,
      data,
    });
  }

  groupStringStats(col: StringColumn, group: IOrderedGroup) {
    const { summary, data } = this.summaryStringStatsD(col);
    return taskNow({
      group: this.stringStatsBuilder(
        group.order,
        col,
        summary.topN.map((d) => d.value)
      ),
      summary,
      data,
    });
  }

  summaryBoxPlotStats(col: Column & INumberColumn, raw?: boolean) {
    return taskNow(this.summaryBoxPlotStatsD(col, raw));
  }

  summaryNumberStats(col: Column & INumberColumn, raw?: boolean) {
    return taskNow(this.summaryNumberStatsD(col, raw));
  }

  summaryCategoricalStats(col: Column & ICategoricalLikeColumn) {
    return taskNow(this.summaryCategoricalStatsD(col));
  }

  summaryDateStats(col: Column & IDateColumn) {
    return taskNow(this.summaryDateStatsD(col));
  }

  summaryStringStats(col: StringColumn) {
    return taskNow(this.summaryStringStatsD(col));
  }

  private summaryNumberStatsD(col: Column & INumberColumn, raw?: boolean): { summary: IStatistics; data: IStatistics } {
    const ranking = col.findMyRanker();
    return this.cached(
      'summary',
      col,
      () => {
        const order = ranking ? ranking.getOrder() : [];
        const data = this.dataNumberStats(col, raw);
        return {
          summary: this.statsBuilder(order, col, data.hist.length, raw),
          data,
        };
      },
      raw ? ':raw' : '',
      ranking && ranking.getOrderLength() === 0
    );
  }

  private summaryBoxPlotStatsD(
    col: Column & INumberColumn,
    raw?: boolean
  ): { summary: IAdvancedBoxPlotData; data: IAdvancedBoxPlotData } {
    const ranking = col.findMyRanker();
    return this.cached(
      'summary',
      col,
      () => {
        const order = ranking ? ranking.getOrder() : [];
        const data = this.dataBoxPlotStats(col, raw);
        return { summary: this.boxplotBuilder(order, col, raw), data };
      },
      raw ? ':braw' : ':b',
      ranking && ranking.getOrderLength() === 0
    );
  }

  private summaryCategoricalStatsD(col: Column & ICategoricalLikeColumn): {
    summary: ICategoricalStatistics;
    data: ICategoricalStatistics;
  } {
    const ranking = col.findMyRanker();
    return this.cached(
      'summary',
      col,
      () => {
        const order = ranking ? ranking.getOrder() : [];
        const data = this.dataCategoricalStats(col);
        return {
          summary: this.categoricalStatsBuilder(order, col),
          data,
        };
      },
      '',
      ranking && ranking.getOrderLength() === 0
    );
  }

  private summaryDateStatsD(col: Column & IDateColumn): { summary: IDateStatistics; data: IDateStatistics } {
    const ranking = col.findMyRanker();
    return this.cached(
      'summary',
      col,
      () => {
        const order = ranking ? ranking.getOrder() : [];
        const data = this.dataDateStats(col);
        return {
          summary: this.dateStatsBuilder(order, col, data),
          data,
        };
      },
      '',
      ranking && ranking.getOrderLength() === 0
    );
  }

  private summaryStringStatsD(col: StringColumn): { summary: IStringStatistics; data: IStringStatistics } {
    return this.cached(
      'summary',
      col,
      () => {
        const ranking = col.findMyRanker()!.getOrder();
        const data = this.dataStringStats(col);
        return {
          summary: this.stringStatsBuilder(ranking, col, undefined),
          data,
        };
      },
      '',
      col.findMyRanker()!.getOrderLength() === 0
    );
  }

  private cached<T>(prefix: string, col: Column, creator: () => T, suffix = '', dontCache = false): T {
    const key = `${col.id}:${prefix}${suffix}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const s = creator();
    if (!dontCache) {
      this.cache.set(key, s);
    }
    return s;
  }

  dataBoxPlotStats(col: Column & INumberColumn, raw?: boolean): IAdvancedBoxPlotData {
    return this.cached(
      'data',
      col,
      () => this.boxplotBuilder(null, col, raw),
      raw ? ':braw' : ':b'
    );
  }

  dataNumberStats(col: Column & INumberColumn, raw?: boolean): IStatistics {
    return this.cached(
      'data',
      col,
      () =>
        this.statsBuilder(null, col, getNumberOfBins(this.data.length), raw),
      raw ? ':raw' : ''
    );
  }

  dataCategoricalStats(col: Column & ICategoricalLikeColumn): ICategoricalStatistics {
    return this.cached(
      'data',

      col,

      () => this.categoricalStatsBuilder(null, col)
    );
  }

  dataDateStats(col: Column & IDateColumn): IDateStatistics {
    return this.cached(
      'data',
      col,
      () => this.dateStatsBuilder(null, col)
    );
  }

  dataStringStats(col: StringColumn): IStringStatistics {
    return this.cached(
      'data',
      col,
      () => this.stringStatsBuilder(null, col)
    );
  }

  terminate() {
    this.cache.clear();
  }
}
