import {ICategory, IndicesArray, UIntTypedArray} from '../model';
import {IForEachAble, ISequence, isIndicesAble} from './interable';
import {createWorkerCodeBlob, IPoorManWorkerScope, toFunctionBody} from './worker';

export interface INumberBin {
  x0: number;
  x1: number;
  count: number;
}

export interface IBoxPlotData {
  readonly min: number;
  readonly max: number;
  readonly median: number;
  readonly q1: number;
  readonly q3: number;
  readonly outlier?: number[];
  readonly whiskerLow?: number;
  readonly whiskerHigh?: number;
}

export interface IAdvancedBoxPlotData extends IBoxPlotData {
  readonly mean: number;
  readonly missing: number;
  readonly count: number;
}

export interface IStatistics {
  readonly mean: number;
  readonly min: number;
  readonly max: number;
  readonly count: number;
  readonly maxBin: number;
  readonly hist: Readonly<INumberBin>[];
  readonly missing: number;
}

export interface ICategoricalBin {
  cat: string;
  count: number;
}

export interface IDateBin {
  x0: Date;
  x1: Date;
  count: number;
}

export interface ICategoricalStatistics {
  readonly maxBin: number;
  readonly hist: Readonly<ICategoricalBin>[];
  readonly missing: number;
  readonly count: number;
}

export enum EDateHistogramGranularity {
  YEAR = 'year',
  MONTH = 'month',
  DAY = 'day'
}

export interface IDateStatistics {
  readonly min: Date | null;
  readonly max: Date | null;
  readonly count: number;
  readonly maxBin: number;
  readonly histGranularity: EDateHistogramGranularity;
  readonly hist: Readonly<IDateBin>[];
  readonly missing: number;
}

/**
 * @internal
 * @param {number} length
 * @returns {number}
 */
export function getNumberOfBins(length: number) {
  if (length === 0) {
    return 1;
  }
  // as by default used in d3 the Sturges' formula
  return Math.ceil(Math.log(length) / Math.LN2) + 1;
}

export function min(values: number[]): number;
export function min<T>(values: T[], acc?: (v: T) => number): number;
export function min<T>(values: T[], acc?: (v: T) => number) {
  let min = Number.POSITIVE_INFINITY;
  for (const d of values) {
    const v = acc ? acc(d) : <number><unknown>d;
    if (v < min) {
      min = v;
    }
  }
  return min;
}

export function max(values: number[]): number;
export function max<T>(values: T[], acc?: (v: T) => number): number;
export function max<T>(values: T[], acc?: (v: T) => number) {
  let max = Number.NEGATIVE_INFINITY;
  for (const d of values) {
    const v = acc ? acc(d) : <number><unknown>d;
    if (v > max) {
      max = v;
    }
  }
  return max;
}

export function extent(values: number[]): [number, number];
export function extent<T>(values: T[], acc?: (v: T) => number): [number, number];
export function extent<T>(values: T[], acc?: (v: T) => number) {
  let max = Number.NEGATIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (const d of values) {
    const v = acc ? acc(d) : <number><unknown>d;
    if (v < min) {
      min = v;
    }
    if (v > max) {
      max = v;
    }
  }
  return [min, max];
}

export function range(length: number) {
  const r: number[] = new Array(length);
  for (let i = 0; i < length; ++i) {
    r[i] = i;
  }
  return r;
}

export function empty(length: number) {
  const r: null[] = new Array(length);
  r.fill(null);
  return r;
}

export function quantile(values: ArrayLike<number>, quantile: number, length = values.length) {
  if (length === 0) {
    return NaN;
  }
  const target = (length - 1) * quantile;
  const index = Math.floor(target);
  if (index === target) {
    return values[index];
  }
  const v = values[index];
  const vAfter = values[index + 1];
  return v + (vAfter - v) * (target - index); // shift by change
}

export function median(values: number[]): number;
export function median<T>(values: T[], acc?: (v: T) => number): number;
export function median<T>(values: T[], acc?: (v: T) => number) {
  const arr = acc ? values.map(acc) : (<number[]><unknown>values).slice();
  arr.sort((a, b) => (a < b ? -1 : (a > b ? 1 : 0)));
  return quantile(arr, 0.5);
}

function pushAll<T>(push: (v: T) => void) {
  return (vs: IForEachAble<T>) => {
    if (!isIndicesAble(vs)) {
      vs.forEach(push);
      return;
    }
    // tslint:disable-next-line:prefer-for-of
    for (let j = 0; j < vs.length; ++j) {
      push(vs[j]);
    }
  };
}

export interface IBuilder<T, R> {
  push(v: T): void;
  pushAll(vs: IForEachAble<T>): void;
  build(): R;
}

export function boxplotBuilder(fixedLength?: number): IBuilder<number, IAdvancedBoxPlotData> & { buildArr: (s: Float32Array) => IAdvancedBoxPlotData} {
  // filter out NaN
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let length = 0;
  let missing = 0;

  const values: number[] = [];
  const vs: Float32Array | null = fixedLength != null ? new Float32Array(fixedLength) : null;

  const push = (v: number) => {
    length += 1;
    if (v == null || isNaN(v)) {
      missing += 1;
      return;
    }
    if (v < min) {
      min = v;
    }
    if (v > max) {
      max = v;
    }
    sum += v;
  };

  const pushAndSave = (v: number) => {
    push(v);
    if (vs) {
      vs[length] = v;
    } else {
      values.push(v);
    }
  };


  const invalid = {
    min: NaN,
    max: NaN,
    mean: NaN,
    missing,
    count: length,
    whiskerHigh: NaN,
    whiskerLow: NaN,
    outlier: [],
    median: NaN,
    q1: NaN,
    q3: NaN
  };

  const buildImpl = (s: ArrayLike<number>) => {
    const valid = length - missing;
    const median = quantile(s, 0.5, valid)!;
    const q1 = quantile(s, 0.25, valid)!;
    const q3 = quantile(s, 0.75, valid)!;

    const iqr = q3 - q1;
    const left = q1 - 1.5 * iqr;
    const right = q3 + 1.5 * iqr;

    let outlier: number[] = [];
    // look for the closests value which is bigger than the computed left
    let whiskerLow = left;
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < valid; ++i) {
      const v = s[i];
      if (left < v) {
        whiskerLow = v;
        break;
      }
      // outlier
      outlier.push(v);
    }
    // look for the closests value which is smaller than the computed right
    let whiskerHigh = right;
    const reversedOutliers: number[] = [];
    for (let i = valid - 1; i >= 0; --i) {
      const v = s[i];
      if (v < right) {
        whiskerHigh = v;
        break;
      }
      // outlier
      reversedOutliers.push(v);
    }

    outlier = outlier.concat(reversedOutliers.reverse());

    return {
      min,
      max,
      count: length,
      missing,
      mean: sum / valid,
      whiskerHigh,
      whiskerLow,
      outlier,
      median,
      q1,
      q3
    };
  };

  const build = () => {
    const valid = length - missing;

    if (valid === 0) {
      return invalid;
    }

    const s = vs ? vs.sort() : Float32Array.from(values).sort();
    return buildImpl(s);
  };

  const buildArr = (vs: Float32Array) => {
    const s = vs.slice().sort();
    // tslint:disable-next-line:prefer-for-of
    for (let j = 0; j < vs.length; ++j) {
      push(vs[j]);
    }
    // missing are the last
    return buildImpl(s);
  };

  return {
    push: pushAndSave,
    build,
    buildArr,
    pushAll: pushAll(pushAndSave)
  };
}

/**
 * @internal
 */
export function normalizedStatsBuilder(numberOfBins: number): IBuilder<number, IStatistics> {

  const hist: INumberBin[] = [];

  let x0 = 0;
  const binWidth = 1. / numberOfBins;
  for (let i = 0; i < numberOfBins; ++i, x0 += binWidth) {
    hist.push({
      x0,
      x1: x0 + binWidth,
      count: 0
    });
  }

  const bin1 = 0 + binWidth;
  const binN = 1 - binWidth;

  const toBin = (v: number) => {
    if (v < bin1) {
      return 0;
    }
    if (v >= binN) {
      return numberOfBins - 1;
    }
    if (numberOfBins === 3) {
      return 1;
    }
    let low = 1;
    let high = numberOfBins - 1;
    // binary search
    while (low < high) {
      const center = Math.floor((high + low) / 2);
      if (v < hist[center].x1) {
        high = center;
      } else {
        low = center + 1;
      }
    }
    return low;
  };

  // filter out NaN
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let length = 0;
  let missing = 0;

  const push = (v: number) => {
    length += 1;
    if (v == null || isNaN(v)) {
      missing += 1;
      return;
    }
    if (v < min) {
      min = v;
    }
    if (v > max) {
      max = v;
    }
    sum += v;

    hist[toBin(v)].count++;
  };

  const build = () => {
    const valid = length - missing;
    if (valid === 0) {
      return {
        count: missing,
        missing,
        min: NaN,
        max: NaN,
        mean: NaN,
        hist,
        maxBin: 0
      };
    }
    return {
      count: length,
      min,
      max,
      mean: sum / valid,
      missing,
      hist,
      maxBin: hist.reduce((a, b) => Math.max(a, b.count), 0)
    };
  };

  return {push, build, pushAll: pushAll(push)};
}

function computeGranularity(min: Date | null, max: Date | null) {
  if (min == null || max == null) {
    return {histGranularity: EDateHistogramGranularity.YEAR, hist: []};
  }
  const hist: IDateBin[] = [];

  if (max.getFullYear() - min.getFullYear() >= 2) {
    // years
    const minYear = min.getFullYear();
    const maxYear = max.getFullYear();
    for (let i = minYear; i <= maxYear; ++i) {
      hist.push({
        x0: new Date(i, 0, 1),
        x1: new Date(i + 1, 0, 1),
        count: 0
      });
    }
    return {hist, histGranularity: EDateHistogramGranularity.YEAR};
  }

  if ((max.getTime() - min.getTime()) <= 1000 * 60 * 60 * 24 * 31) {
    // less than a month use day
    let x0 = new Date(min.getFullYear(), min.getMonth(), min.getDay());
    while (x0 <= max) {
      const x1 = new Date(x0);
      x1.setDate(x1.getDate() + 1);
      hist.push({
        x0,
        x1,
        count: 0
      });
      x0 = x1;
    }
    return {hist, histGranularity: EDateHistogramGranularity.DAY};
  }

  let x0 = new Date(min.getFullYear(), min.getMonth(), 1);
  while (x0 <= max) {
    const x1 = new Date(x0);
    x1.setMonth(x1.getMonth() + 1);
    hist.push({
      x0,
      x1,
      count: 0
    });
    x0 = x1;
  }
  return {hist, histGranularity: EDateHistogramGranularity.MONTH};
}

export function dateStatsBuilder(template?: IDateStatistics): IBuilder<Date | null, IDateStatistics> {
  // filter out NaN
  let min: Date | null = null;
  let max: Date | null = null;
  let count = 0;
  let missing = 0;

  // yyyymmdd, count
  const byDay = new Map<number, number>();
  const push = (v: Date | null) => {
    count += 1;
    if (!v || v == null) {
      missing += 1;
      return;
    }
    if (min == null || v < min) {
      min = v;
    }
    if (max == null || v > max) {
      max = v;
    }
    const key = v.getFullYear() * 10000 + v.getMonth() * 100 + v.getDate();
    byDay.set(key, (byDay.get(key) || 0) + 1);
  };

  const build = () => {
    const {histGranularity, hist} = template ? {
      histGranularity: template.histGranularity, hist: template.hist.map((d) => Object.assign({}, d, {count: 0}))
    } : computeGranularity(min, max);

    return {
      min,
      max,
      missing,
      count,
      maxBin: hist.reduce((acc, h) => Math.max(acc, h.count), 0),
      hist,
      histGranularity
    };
  };

  return {push, build, pushAll: pushAll(push)};
}

/**
 * computes a categorical histogram
 * @param arr the data array
 * @param categories the list of known categories
 * @returns {{hist: {cat: string, y: number}[]}}
 * @internal
 */
export function categoricalStatsBuilder(categories: {name: string}[]): IBuilder<{name: string} | null, ICategoricalStatistics> {
  const m = new Map<string, number>();
  categories.forEach((cat) => m.set(cat.name, 0));

  let missing = 0;
  let count = 0;

  const push = (v: ICategory | null) => {
    count += 1;
    if (v == null) {
      missing += 1;
    } else {
      m.set(v.name, (m.get(v.name) || 0) + 1);
    }
  };

  const build = () => {
    const entries: {cat: string; count: number}[] = categories.map((d) => ({cat: d.name, count: m.get(d.name)!}));
    const maxBin = entries.reduce((a, b) => Math.max(a, b.count), Number.NEGATIVE_INFINITY);

    return {
      maxBin,
      hist: entries,
      count,
      missing
    };
  };

  return {push, build, pushAll: pushAll(push)};
}

/**
 * round to the given commas similar to d3.round
 * @param {number} v
 * @param {number} precision
 * @returns {number}
 * @internal
 */
export function round(v: number, precision: number = 0) {
  if (precision === 0) {
    return Math.round(v);
  }
  const scale = Math.pow(10, precision);
  return Math.round(v * scale) / scale;
}

/**
 * compares two number whether they are similar up to delta
 * @param {number} a first numbre
 * @param {number} b second number
 * @param {number} delta
 * @returns {boolean} a and b are similar
 * @internal
 */
export function similar(a: number, b: number, delta = 0.5) {
  if (a === b) {
    return true;
  }
  return Math.abs(a - b) < delta;
}


export function isPromiseLike<T>(value: any): value is PromiseLike<T> {
  return value instanceof Promise || typeof value.then === 'function';
}


/**
 * @internal
 */
export function createIndexArray(length: number, dataSize = length) {
  if (dataSize <= 255) {
    return new Uint8Array(length);
  }
  if (dataSize <= 65535) {
    return new Uint16Array(length);
  }
  return new Uint32Array(length);
}

export function toIndexArray(arr: ISequence<number> | IndicesArray): UIntTypedArray {
  if (arr instanceof Uint8Array || arr instanceof Uint16Array || arr instanceof Uint32Array) {
    return arr.slice();
  }
  const l = arr.length;
  if (l <= 255) {
    return Uint8Array.from(arr);
  }
  if (l <= 65535) {
    return Uint16Array.from(arr);
  }
  return Uint32Array.from(arr);
}



function asc(a: any, b: any) {
  return a < b ? -1 : ((a > b) ? 1 : 0);
}

function desc(a: any, b: any) {
  return a < b ? 1 : ((a > b) ? -1 : 0);
}

export declare type ILookUpArray = Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | string[] | Float32Array | Float64Array;

export function sortComplex(indices: UIntTypedArray | number[], comparators: {asc: boolean, lookup: ILookUpArray}[]) {
  if (indices.length < 2 || comparators.length === 0) {
    return indices;
  }

  switch (comparators.length) {
    case 1:
      const f = comparators[0]!.asc ? asc : desc;
      const fl = comparators[0]!.lookup;
      return indices.sort((a, b) => {
        const r = f(fl[a]!, fl[b]!);
        return r !== 0 ? r : a - b;
      });
    case 2:
      const f1 = comparators[0]!.asc ? asc : desc;
      const f1l = comparators[0]!.lookup;
      const f2 = comparators[1]!.asc ? asc : desc;
      const f2l = comparators[1]!.lookup;
      return indices.sort((a, b) => {
        let r = f1(f1l[a], f1l[b]);
        r = r !== 0 ? r : f2(f2l[a], f2l[b]);
        return r !== 0 ? r : a - b;
      });
    default:
      const l = comparators.length;
      const fs = comparators.map((d) => d.asc ? asc : desc);
      return indices.sort((a, b) => {
        for (let i = 0; i < l; ++i) {
          const l = comparators[i].lookup;
          const r = fs[i](l[a], l[b]);
          if (r !== 0) {
            return r;
          }
        }
        return a - b;
      });
  }
}

export interface IWorkerMessage {
  type: string;
  uid: number;
}

export interface IStatsWorkerMessage extends IWorkerMessage {
  refIndices: string | null;
  indices?: UIntTypedArray;

  refData: string;
  data?: UIntTypedArray | Float32Array | Int32Array;
}


export interface ISortMessageRequest {
  type: 'sort';
  uid: number;
  ref: string;
  indices: UIntTypedArray;
  sortOrders?: {asc: boolean, lookup: ILookUpArray}[];
}

export interface ISortMessageResponse {
  type: 'sort';

  ref: string;
  order: IndicesArray;
}

export interface IDeleteRefMessageRequest {
  type: 'deleteRef';

  ref: string;
  startsWith?: boolean;
}

export interface ISetRefMessageRequest {
  type: 'setRef';
  uid: number;

  ref: string;
  data: UIntTypedArray | Float32Array | Int32Array | null;
}

export interface IDateStatsMessageRequest {
  type: 'dateStats';
  uid: number;

  refIndices: string | null;
  indices?: UIntTypedArray;

  refData: string;
  data?: UIntTypedArray;

  template?: IDateStatistics;
}

export interface IDateStatsMessageResponse {
  type: 'dateStats';
  uid: number;

  stats: IDateStatistics;
}

export interface INumberStatsMessageRequest {
  type: 'numberStats';
  uid: number;

  refIndices: string | null;
  indices?: UIntTypedArray;

  refData: string;
  data?: Float32Array;

  numberOfBins: number;
}

export interface INumberStatsMessageResponse {
  type: 'numberStats';
  uid: number;

  stats: IStatistics;
}

export interface IBoxPlotStatsMessageRequest {
  type: 'boxplotStats';
  uid: number;

  refIndices: string | null;
  indices?: UIntTypedArray;

  refData: string;
  data?: Float32Array;
}

export interface IBoxPlotStatsMessageResponse {
  type: 'boxplotStats';
  uid: number;

  stats: IAdvancedBoxPlotData;
}

export interface ICategoricalStatsMessageRequest {
  type: 'categoricalStats';
  uid: number;

  refIndices: string | null;
  indices?: UIntTypedArray;

  refData: string;
  data?: UIntTypedArray;

  categories: string[];
}

export interface ICategoricalStatsMessageResponse {
  type: 'categoricalStats';
  uid: number;

  stats: ICategoricalStatistics;
}

const MISSING_DATE = 2147483647;

export function dateValueCacheBuilder(length: number) {
  const vs = new Int32Array(length);
  let i = 0;
  return {
    push: (d: Date | null) => vs[i++] = d == null ? MISSING_DATE : d.getTime(),
    cache: vs
  };
}

export function dateValueCache2Value(v: number) {
  return v === MISSING_DATE ? null : new Date(v);
}

export function categoricalValueCacheBuilder(length: number, categories: {name: string}[]) {
  const vs = createIndexArray(length, categories.length + 1);
  const name2index = new Map<string, number>();
  for (let i = 0; i < categories.length; ++i) {
    name2index.set(categories[i].name, i + 1); // shift by one for missing = 0
  }
  let i = 0;
  return {
    push: (d: {name: string} | null) => vs[i++] = d == null ? 0 : name2index.get(d.name) || 0,
    cache: vs
  };
}

export function categoricalValueCache2Value<T extends {name: string}>(v: number, categories: T[]) {
  return v === 0 ? null : categories[v - 1];
}


function sortWorkerMain(self: IPoorManWorkerScope) {
  const refs = new Map<string, UIntTypedArray | Float32Array | Int32Array>();

  const sort = (r: ISortMessageRequest) => {
    if (r.sortOrders) {
      sortComplex(r.indices, r.sortOrders);
    }
    const order = r.indices;

    self.postMessage(<ISortMessageResponse>{
      type: r.type,
      uid: r.uid,
      ref: r.ref,
      order
    }, [r.indices.buffer]);
  };

  const setRef = (r: ISetRefMessageRequest) => {
    if (r.data) {
      refs.set(r.ref, r.data);
    } else {
      refs.delete(r.ref);
    }
  };

  const deleteRef = (r: IDeleteRefMessageRequest) => {
    if (!r.startsWith) {
      refs.delete(r.ref);
      return;
    }

    for (const key of Array.from(refs.keys())) {
      if (key.startsWith(r.ref)) {
        refs.delete(key);
      }
    }
  };

  const resolveRefs = <T extends UIntTypedArray | Float32Array | Int32Array>(r: IStatsWorkerMessage) => {
    const data: T = r.data ? <T><unknown>r.data : <T><unknown>refs.get(r.refData)!;
    const indices = r.indices ? r.indices : (r.refIndices ? <UIntTypedArray>refs.get(r.refIndices)! : undefined);
    if (r.refData) {
      refs.set(r.refData, data);
    }
    if (r.refIndices) {
      refs.set(r.refIndices, indices!);
    }
    return {data, indices};
  };

  const dateStats = (r: IDateStatsMessageRequest) => {
    const {data, indices} = resolveRefs<Int32Array>(r);

    const b = dateStatsBuilder(r.template);
    if (indices) {
      // tslint:disable-next-line:prefer-for-of
      for (let ii = 0; ii < indices.length; ++ii) {
        const v = data[indices[ii]];
        b.push(dateValueCache2Value(v));
      }
    } else {
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < data.length; ++i) {
        b.push(dateValueCache2Value(data[i]));
      }
    }
    self.postMessage(<IDateStatsMessageResponse>{
      type: r.type,
      uid: r.uid,
      stats: b.build()
    });
  };

  const categoricalStats = (r: ICategoricalStatsMessageRequest) => {
    const {data, indices} = resolveRefs<UIntTypedArray>(r);

    refs.set(r.refData, data);
    if (r.refIndices) {
      refs.set(r.refIndices, indices!);
    }

    const cats = r.categories.map((name) => ({name}));
    const b = categoricalStatsBuilder(cats);
    if (indices) {
      // tslint:disable-next-line:prefer-for-of
      for (let ii = 0; ii < indices.length; ++ii) {
        b.push(categoricalValueCache2Value(data[indices[ii]], cats));
      }
    } else {
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < data.length; ++i) {
        b.push(categoricalValueCache2Value(data[i], cats));
      }
    }

    self.postMessage(<ICategoricalStatsMessageResponse>{
      type: r.type,
      uid: r.uid,
      stats: b.build()
    });
  };

  const numberStats = (r: INumberStatsMessageRequest) => {
    const {data, indices} = resolveRefs<Float32Array>(r);

    const b = normalizedStatsBuilder(r.numberOfBins);

    if (indices) {
      // tslint:disable-next-line:prefer-for-of
      for (let ii = 0; ii < indices.length; ++ii) {
        b.push(data[indices[ii]]);
      }
    } else {
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < data.length; ++i) {
        b.push(data[i]);
      }
    }

    self.postMessage(<INumberStatsMessageResponse>{
      type: r.type,
      uid: r.uid,
      stats: b.build()
    });
  };

  const boxplotStats = (r: IBoxPlotStatsMessageRequest) => {
    const {data, indices} = resolveRefs<Float32Array>(r);

    const b = boxplotBuilder(indices ? indices.length : undefined);

    let stats: IAdvancedBoxPlotData;
    if (!indices) {
      stats = b.buildArr(data);
    } else {
      // tslint:disable-next-line:prefer-for-of
      for (let ii = 0; ii < indices.length; ++ii) {
        b.push(data[indices[ii]]);
      }
      stats = b.build();
    }

    self.postMessage(<IBoxPlotStatsMessageResponse>{
      type: r.type,
      uid: r.uid,
      stats
    });
  };

  const msgHandlers: {[key: string]: (r: any) => void} = {
    sort,
    setRef,
    deleteRef,
    dateStats,
    categoricalStats,
    numberStats,
    boxplotStats
  };

  self.addEventListener('message', (evt) => {
    const r = evt.data;
    if (typeof r.uid !== 'number' || typeof r.type !== 'string') {
      return;
    }
    const h = msgHandlers[r.type];
    if (h) {
      h(r);
    }
  });
}

export const WORKER_BLOB = createWorkerCodeBlob([
  pushAll.toString(),
  quantile.toString(),
  normalizedStatsBuilder.toString(),
  boxplotBuilder.toString(),
  computeGranularity.toString(),
  dateStatsBuilder.toString(),
  categoricalStatsBuilder.toString(),
  createIndexArray.toString(),
  asc.toString(),
  desc.toString(),
  sortComplex.toString(),
  dateValueCache2Value.toString(),
  categoricalValueCache2Value.toString(),
  toFunctionBody(sortWorkerMain)
]);
