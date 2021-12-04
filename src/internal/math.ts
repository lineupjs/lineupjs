import type { ICategory, IndicesArray, UIntTypedArray } from '../model';
import { IForEachAble, ISequence, isIndicesAble } from './interable';
import type {
  IAdvancedBoxPlotData,
  IStatistics,
  INumberBin,
  IDateBin,
  IDateStatistics,
  ICategoricalStatistics,
  ICategoricalBin,
  IDateHistGranularity,
  IStringStatistics,
} from './mathInterfaces';

/**
 * computes the optimal number of bins for a given array length
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

/**
 * @internal
 */
export function min(values: number[]): number;
export function min<T>(values: T[], acc: (v: T) => number): number;
export function min<T>(values: T[], acc?: (v: T) => number) {
  let min = Number.POSITIVE_INFINITY;
  for (const d of values) {
    const v = acc ? acc(d) : (d as any as number);
    if (v < min) {
      min = v;
    }
  }
  return min;
}

/**
 * @internal
 */
export function max(values: number[]): number;
export function max<T>(values: T[], acc: (v: T) => number): number;
export function max<T>(values: T[], acc?: (v: T) => number) {
  let max = Number.NEGATIVE_INFINITY;
  for (const d of values) {
    const v = acc ? acc(d) : (d as any as number);
    if (v > max) {
      max = v;
    }
  }
  return max;
}

/**
 * @internal
 */
export function extent(values: number[]): [number, number];
export function extent<T>(values: T[], acc: (v: T) => number): [number, number];
export function extent<T>(values: T[], acc?: (v: T) => number) {
  let max = Number.NEGATIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (const d of values) {
    const v = acc ? acc(d) : (d as any as number);
    if (v < min) {
      min = v;
    }
    if (v > max) {
      max = v;
    }
  }
  return [min, max];
}

/**
 * @internal
 */
export function range(length: number) {
  const r: number[] = new Array(length);
  for (let i = 0; i < length; ++i) {
    r[i] = i;
  }
  return r;
}

/**
 * an empty range
 * @internal
 */
export function empty(length: number) {
  const r: null[] = new Array(length);
  r.fill(null);
  return r;
}

/**
 * computes the X quantile assumes the values are sorted
 * @internal
 */
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

/**
 * @internal
 */
export function median(values: number[]): number;
export function median<T>(values: T[], acc: (v: T) => number): number;
export function median<T>(values: T[], acc?: (v: T) => number) {
  const arr = acc ? values.map(acc) : (values as any as number[]).slice();
  arr.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return quantile(arr, 0.5);
}

function pushAll<T>(push: (v: T) => void) {
  return (vs: IForEachAble<T>) => {
    if (!isIndicesAble(vs)) {
      vs.forEach(push);
      return;
    }

    for (let j = 0; j < vs.length; ++j) {
      push(vs[j]);
    }
  };
}

/**
 * common interface for a builder pattern
 * @internal
 */
export interface IBuilder<T, R> {
  /**
   * push an entry
   */
  push(v: T): void;
  /**
   * push multiple values at once
   */
  pushAll(vs: IForEachAble<T>): void;

  /**
   * build the result
   */
  build(): R;
}

/**
 * @internal
 */
export function boxplotBuilder(
  fixedLength?: number
): IBuilder<number, IAdvancedBoxPlotData> & { buildArr: (s: Float32Array) => IAdvancedBoxPlotData } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let length = 0;
  let missing = 0;

  // if fixed size use the typed array else a regular array
  const values: number[] = [];
  const vs: Float32Array | null = fixedLength != null ? new Float32Array(fixedLength) : null;

  const push = (v: number) => {
    length += 1;
    if (v == null || Number.isNaN(v)) {
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
    q3: NaN,
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
    // look for the closest value which is bigger than the computed left
    let whiskerLow = left;

    for (let i = 0; i < valid; ++i) {
      const v = s[i];
      if (left < v) {
        whiskerLow = v;
        break;
      }
      // outlier
      outlier.push(v);
    }
    // look for the closest value which is smaller than the computed right
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
      q3,
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
    pushAll: pushAll(pushAndSave),
  };
}

/**
 * @internal
 */
export function numberStatsBuilder(domain: [number, number], numberOfBins: number): IBuilder<number, IStatistics> {
  const hist: INumberBin[] = [];

  let x0 = domain[0];
  const range = domain[1] - domain[0];
  const binWidth = range / numberOfBins;
  for (let i = 0; i < numberOfBins; ++i, x0 += binWidth) {
    hist.push({
      x0,
      x1: x0 + binWidth,
      count: 0,
    });
  }

  const bin1 = domain[0] + binWidth;
  const binN = domain[1] - binWidth;

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
    if (v == null || Number.isNaN(v)) {
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
        maxBin: 0,
      };
    }
    return {
      count: length,
      min,
      max,
      mean: sum / valid,
      missing,
      hist,
      maxBin: hist.reduce((a, b) => Math.max(a, b.count), 0),
    };
  };

  return { push, build, pushAll: pushAll(push) };
}

/**
 * guesses the histogram granularity to use based on min and max date
 */
function computeGranularity(
  min: Date | null,
  max: Date | null
): { histGranularity: IDateHistGranularity; hist: IDateBin[] } {
  if (min == null || max == null) {
    return { histGranularity: 'year', hist: [] };
  }
  const hist: IDateBin[] = [];

  if (max.getFullYear() - min.getFullYear() >= 2) {
    // more than two years difference
    const minYear = min.getFullYear();
    const maxYear = max.getFullYear();
    for (let i = minYear; i <= maxYear; ++i) {
      hist.push({
        x0: new Date(i, 0, 1),
        x1: new Date(i + 1, 0, 1),
        count: 0,
      });
    }
    return { hist, histGranularity: 'year' };
  }

  if (max.getTime() - min.getTime() <= 1000 * 60 * 60 * 24 * 31) {
    // less than a month use day
    let x0 = new Date(min.getFullYear(), min.getMonth(), min.getDate());
    while (x0 <= max) {
      const x1 = new Date(x0);
      x1.setDate(x1.getDate() + 1);
      hist.push({
        x0,
        x1,
        count: 0,
      });
      x0 = x1;
    }
    return { hist, histGranularity: 'day' };
  }

  // by month
  let x0 = new Date(min.getFullYear(), min.getMonth(), 1);
  while (x0 <= max) {
    const x1 = new Date(x0);
    x1.setMonth(x1.getMonth() + 1);
    hist.push({
      x0,
      x1,
      count: 0,
    });
    x0 = x1;
  }
  return { hist, histGranularity: 'month' };
}

function pushDateHist(hist: IDateBin[], v: Date, count = 1) {
  if (v < hist[0].x1) {
    hist[0].count += count;
    return;
  }
  const l = hist.length - 1;
  if (v > hist[l].x0) {
    hist[l].count += count;
    return;
  }
  if (l === 2) {
    hist[1].count += count;
    return;
  }

  let low = 1;
  let high = l;
  // binary search
  while (low < high) {
    const center = Math.floor((high + low) / 2);
    if (v < hist[center].x1) {
      high = center;
    } else {
      low = center + 1;
    }
  }
  hist[low].count += count;
}
/**
 * @internal
 */
export function dateStatsBuilder(template?: IDateStatistics): IBuilder<Date | null, IDateStatistics> {
  let min: Date | null = null;
  let max: Date | null = null;
  let count = 0;
  let missing = 0;

  // yyyymmdd, count
  const byDay = new Map<number, { x: Date; count: number }>();
  const templateHist = template ? template.hist.map((d) => ({ x0: d.x0, x1: d.x1, count: 0 })) : null;

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
    if (templateHist) {
      pushDateHist(templateHist, v, 1);
      return;
    }
    const key = v.getFullYear() * 10000 + v.getMonth() * 100 + v.getDate();
    if (byDay.has(key)) {
      byDay.get(key)!.count++;
    } else {
      byDay.set(key, { count: 1, x: v });
    }
  };

  const build = () => {
    if (templateHist) {
      return {
        min,
        max,
        missing,
        count,
        maxBin: templateHist.reduce((acc, h) => Math.max(acc, h.count), 0),
        hist: templateHist,
        histGranularity: template!.histGranularity,
      };
    }
    // copy template else derive
    const { histGranularity, hist } = computeGranularity(min, max);

    byDay.forEach((v) => pushDateHist(hist, v.x, v.count));

    return {
      min,
      max,
      missing,
      count,
      maxBin: hist.reduce((acc, h) => Math.max(acc, h.count), 0),
      hist,
      histGranularity,
    };
  };

  return { push, build, pushAll: pushAll(push) };
}

/**
 * computes a categorical histogram
 * @param arr the data array
 * @param categories the list of known categories
 * @returns {{hist: {cat: string, y: number}[]}}
 * @internal
 */
export function categoricalStatsBuilder(
  categories: { name: string }[]
): IBuilder<{ name: string } | null, ICategoricalStatistics> {
  const m = new Map<string, ICategoricalBin>();
  categories.forEach((cat) => m.set(cat.name, { cat: cat.name, count: 0 }));

  let missing = 0;
  let count = 0;

  const push = (v: ICategory | null) => {
    count += 1;
    if (v == null) {
      missing += 1;
    } else {
      const entry = m.get(v.name);
      if (entry) {
        entry.count++;
      } else {
        m.set(v.name, { cat: v.name, count: 1 });
      }
    }
  };

  const build = () => {
    const entries: ICategoricalBin[] = categories.map((d) => m.get(d.name)!);
    const maxBin = entries.reduce((a, b) => Math.max(a, b.count), Number.NEGATIVE_INFINITY);

    return {
      maxBin,
      hist: entries,
      count,
      missing,
    };
  };

  return { push, build, pushAll: pushAll(push) };
}

/**
 * computes a string statistics
 * @internal
 */
export function stringStatsBuilder(topN: number | readonly string[]): IBuilder<string | null, IStringStatistics> {
  let missing = 0;
  let count = 0;
  const m = new Map<string, { value: string; count: number }>();
  if (Array.isArray(topN)) {
    for (const t of topN) {
      m.set(t, { value: t, count: 0 });
    }
  }

  const push = (v: string | null) => {
    count += 1;
    if (v == null) {
      missing += 1;
    } else {
      const entry = m.get(v);
      if (entry) {
        entry.count++;
      } else {
        m.set(v, { value: v, count: 1 });
      }
    }
  };

  const build = (): IStringStatistics => {
    const byFrequency = Array.isArray(topN)
      ? topN.map((d) => m.get(d)!)
      : Array.from(m.values()).sort((a, b) => {
          if (a.count === b.count) {
            return a.value.localeCompare(b.value);
          }
          return b.count - a.count;
        });
    return {
      count,
      missing,
      topN: byFrequency.slice(0, Math.min(byFrequency.length, Array.isArray(topN) ? topN.length : (topN as number))),
      unique: m.size,
    };
  };

  return { push, build, pushAll: pushAll(push) };
}

/**
 * round to the given commas similar to d3.round
 * @param {number} v
 * @param {number} precision
 * @returns {number}
 * @internal
 */
export function round(v: number, precision = 0) {
  if (precision === 0) {
    return Math.round(v);
  }
  const scale = Math.pow(10, precision);
  return Math.round(v * scale) / scale;
}

/**
 * compares two number whether they are similar up to delta
 * @param {number} a first number
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

/**
 * @internal
 */
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

/**
 * @internal
 */
export function toIndexArray(arr: ISequence<number> | IndicesArray, maxDataIndex?: number): UIntTypedArray {
  if (arr instanceof Uint8Array || arr instanceof Uint16Array || arr instanceof Uint32Array) {
    return arr.slice();
  }
  const l = maxDataIndex != null ? maxDataIndex : arr.length;
  if (l <= 255) {
    return Uint8Array.from(arr);
  }
  if (l <= 65535) {
    return Uint16Array.from(arr);
  }
  return Uint32Array.from(arr);
}

function createLike(template: IndicesArray, total: number, maxDataIndex?: number) {
  if (template instanceof Uint8Array) {
    return new Uint8Array(total);
  }
  if (template instanceof Uint16Array) {
    return new Uint16Array(total);
  }
  if (template instanceof Uint32Array) {
    return new Uint32Array(total);
  }
  return createIndexArray(total, maxDataIndex);
}

/**
 * @internal
 */
export function joinIndexArrays(groups: IndicesArray[], maxDataIndex?: number) {
  switch (groups.length) {
    case 0:
      return [];
    case 1:
      return groups[0];
    default:
      const total = groups.reduce((a, b) => a + b.length, 0);
      const r = createLike(groups[0], total, maxDataIndex);
      let shift = 0;
      for (const g of groups) {
        r.set(g, shift);
        shift += g.length;
      }
      return r;
  }
}

function asc(a: any, b: any) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function desc(a: any, b: any) {
  return a < b ? 1 : a > b ? -1 : 0;
}

export declare type ILookUpArray =
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | string[]
  | Float32Array
  | Float64Array;

/**
 * sort the given index array based on the lookup array
 * @internal
 */
export function sortComplex(indices: UIntTypedArray | number[], comparators: { asc: boolean; lookup: ILookUpArray }[]) {
  if (indices.length < 2) {
    return indices;
  }

  switch (comparators.length) {
    case 0:
      // sort by indices
      return indices.sort();
    case 1:
      const c = comparators[0]!.asc ? asc : desc;
      const cLookup = comparators[0]!.lookup;
      return indices.sort((a, b) => {
        const r = c(cLookup[a]!, cLookup[b]!);
        return r !== 0 ? r : a - b;
      });
    case 2:
      const c1 = comparators[0]!.asc ? asc : desc;
      const c1Lookup = comparators[0]!.lookup;
      const c2 = comparators[1]!.asc ? asc : desc;
      const c2Lookup = comparators[1]!.lookup;
      return indices.sort((a, b) => {
        let r = c1(c1Lookup[a], c1Lookup[b]);
        r = r !== 0 ? r : c2(c2Lookup[a], c2Lookup[b]);
        return r !== 0 ? r : a - b;
      });
    default:
      const l = comparators.length;
      const fs = comparators.map((d) => (d.asc ? asc : desc));
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


/**
 * helper to build a value cache for dates, use dateValueCache2Value to convert back
 * @internal
 */
export function dateValueCacheBuilder(length: number) {
  const vs = new Float64Array(length);
  let i = 0;
  return {
    push: (d: Date | null) => (vs[i++] = d == null ? NaN : d.getTime()),
    cache: vs,
  };
}

/**
 * @internal
 */
export function dateValueCache2Value(v: number) {
  return Number.isNaN(v) ? null : new Date(v);
}

/**
 * @internal
 */
export function categoricalValueCacheBuilder(length: number, categories: { name: string }[]) {
  const vs = createIndexArray(length, categories.length + 1);
  const name2index = new Map<string, number>();
  for (let i = 0; i < categories.length; ++i) {
    name2index.set(categories[i].name, i + 1); // shift by one for missing = 0
  }
  let i = 0;
  return {
    push: (d: { name: string } | null) => (vs[i++] = d == null ? 0 : name2index.get(d.name) || 0),
    cache: vs,
  };
}

/**
 * @internal
 */
export function categoricalValueCache2Value<T extends { name: string }>(v: number, categories: T[]) {
  return v === 0 ? null : categories[v - 1];
}
