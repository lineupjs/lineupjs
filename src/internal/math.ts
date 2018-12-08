import {ICategory} from '../model';
import {ISequence, IForEachAble} from './interable';
import {bisectLeft} from 'd3-array';

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
  readonly hist: INumberBin[];
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
  readonly hist: ICategoricalBin[];
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
  readonly hist: IDateBin[];
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

function quantile(values: Float32Array, quantile: number) {
  if (values.length === 0) {
    return NaN;
  }
  const target = (values.length - 1) * quantile;
  const index = Math.floor(target);
  if (index === target) {
    return values[index];
  }
  const v = values[index];
  const vAfter = values[index + 1];
  return v + (vAfter - v) * (target - index); // shift by change
}

export function computeBoxPlot(arr: ISequence<IForEachAble<number> | number>): IAdvancedBoxPlotData {
  // filter out NaN
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let length = 0;
  let missing = 0;

  const values: number[] = [];

  const integrate = (v: number) => {
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

  arr.forEach((vs) => {
    if (typeof vs === 'number') {
      integrate(vs);
      return;
    }
    vs.forEach(integrate);
  });

  const valid = length - missing;

  if (valid === 0) {
    return {
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
  }

  const s = Float32Array.from(values).sort();

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
}



/**
 * computes the simple statistics of an array using d3 histogram
 * @param arr the data array
 * @param acc accessor function
 * @param numberOfBins the number of bins
 * @returns {{min: number, max: number, count: number, hist: histogram.Bin<number>[]}}
 * @internal
 */
export function computeNormalizedStats(arr: ISequence<IForEachAble<number> | number>, numberOfBins?: number): IStatistics {

  const hist: INumberBin[] = [];

  const count = numberOfBins ? numberOfBins : getNumberOfBins(arr.length);
  let x0 = 0;
  const binWidth = 1. / count;
  for (let i = 0; i < count; ++i, x0 += binWidth) {
    hist.push({
      x0,
      x1: x0 + binWidth,
      count: 0
    });
  }

  const bin1 = 0 + binWidth;
  const binN = 1 - binWidth;
  const binEnds = hist.map((d) => d.x1);

  const toBin = (v: number) => {
    if (v < bin1) {
      return 0;
    }
    if (v >= binN) {
      return count - 1;
    }
    return bisectLeft(binEnds, v);
  };

  // filter out NaN
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let length = 0;
  let missing = 0;

  const integrate = (v: number) => {
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

  arr.forEach((vs) => {
    if (typeof vs === 'number') {
      integrate(vs);
      return;
    }
    vs.forEach(integrate);
  });

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

export function computeDateStats(arr: ISequence<IForEachAble<Date | null>>, template?: IDateStatistics): IDateStatistics {
  // filter out NaN
  let min: Date | null = null;
  let max: Date | null = null;
  let count = 0;
  let missing = 0;

  // yyyymmdd, count
  const byDay = new Map<number, number>();
  arr.forEach((vs) => {
    count += 1;
    if (!vs) {
      missing += 1;
      return;
    }
    vs.forEach((v) => {
      if (!v) {
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
    });
  });

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
}

/**
 * computes a categorical histogram
 * @param arr the data array
 * @param categories the list of known categories
 * @returns {{hist: {cat: string, y: number}[]}}
 * @internal
 */
export function computeHist(arr: ISequence<IForEachAble<ICategory | null>>, categories: ICategory[]): ICategoricalStatistics {
  const m = new Map<string, number>();
  categories.forEach((cat) => m.set(cat.name, 0));

  let missing = 0;
  let count = 0;

  arr.forEach((vs) => {
    if (vs == null) {
      missing += 1;
      count += 1;
      return;
    }
    vs.forEach((v) => {
      count += 1;
      if (v == null) {
        missing += 1;
      } else {
        m.set(v.name, (m.get(v.name) || 0) + 1);
      }
    });
  });

  const entries: {cat: string; count: number}[] = categories.map((d) => ({cat: d.name, count: m.get(d.name)!}));
  const maxBin = entries.reduce((a, b) => Math.max(a, b.count), Number.NEGATIVE_INFINITY);

  return {
    maxBin,
    hist: entries,
    count,
    missing
  };
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
