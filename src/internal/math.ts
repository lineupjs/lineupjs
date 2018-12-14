import {ICategory, UIntTypedArray, IndicesArray} from '../model';
import {IForEachAble, isIndicesAble, ISequence} from './interable';
import {IPoorManWorkerScope, toFunctionBody, createWorkerCodeBlob} from './worker';

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

export interface IHistGenerator {
  bins: INumberBin[];
  toBin(value: number): number;
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

export function boxplotBuilder(): IBuilder<number, IAdvancedBoxPlotData> {
  // filter out NaN
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let length = 0;
  let missing = 0;

  const values: number[] = [];

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
    values.push(v);
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
    const median = quantile(s, 0.5)!;
    const q1 = quantile(s, 0.25)!;
    const q3 = quantile(s, 0.75)!;

    const iqr = q3 - q1;
    const left = q1 - 1.5 * iqr;
    const right = q3 + 1.5 * iqr;

    let outlier: number[] = [];
    // look for the closests value which is bigger than the computed left
    let whiskerLow = left;
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < s.length; ++i) {
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
    for (let i = s.length - 1; i >= 0; --i) {
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

    const s = Float32Array.from(values).sort();
    return buildImpl(s);
  };

  return {push, build, pushAll: pushAll(push)};
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
      const center = Math.floor(high + low) / 2;
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
export function categoricalStatsBuilder(categories: ICategory[]): IBuilder<ICategory | null, ICategoricalStatistics> {
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
export function createIndexArray(length: number) {
  if (length <= 255) {
    return new Uint8Array(length);
  }
  if (length <= 65535) {
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


export interface ISortMessageRequest {
  uid: number;

  indices: UIntTypedArray;
  sortOrders?: {asc: boolean, lookup: ILookUpArray}[];
}

export interface ISortMessageResponse {
  uid: number;

  order: IndicesArray;
}


function sortWorkerMain(self: IPoorManWorkerScope) {
  self.addEventListener('message', (evt) => {
    const r = <ISortMessageRequest>evt.data;
    if (typeof r.uid !== 'number') {
      return;
    }

    if (r.sortOrders) {
      sortComplex(r.indices, r.sortOrders);
    }
    self.postMessage(<ISortMessageResponse>{
      uid: r.uid,
      order: r.indices
    }, [r.indices.buffer]);
  });
}

export const WORKER_BLOB = createWorkerCodeBlob([
  createIndexArray.toString(),
  asc.toString(),
  desc.toString(),
  sortComplex.toString(),
  toFunctionBody(sortWorkerMain)
]);
