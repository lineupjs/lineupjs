import {ICategory} from '../model';
import {ISequence} from './interable';
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
}

export interface IStatistics extends IAdvancedBoxPlotData {
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

/**
 * helper class to lazily compute box plotdata out of a given number array
 * @internal
 */
export class LazyBoxPlotData implements IStatistics {
  private values: Float32Array | null = null;

  readonly count: number;
  readonly missing: number;

  readonly max: number;
  readonly min: number;
  readonly sum: number;
  readonly mean: number;

  readonly hist: INumberBin[];

  constructor(values: ISequence<number>, histGen?: IHistGenerator) {
    // filter out NaN
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let sum = 0;
    let length = 0;

    this.hist = histGen ? histGen.bins : [];

    this.values = Float32Array.from(values.filter((v) => {
      length += 1;
      if (v == null || isNaN(v)) {
        return false;
      }
      if (v < min) {
        min = v;
      }
      if (v > max) {
        max = v;
      }
      sum += v;

      if (histGen) {
        this.hist[histGen.toBin(v)].count++;
      }

      return true;
    }));
    this.missing = length - this.values.length;
    this.count = length;

    if (this.values.length === 0) {
      this.max = this.min = this.mean = NaN;
      this.sum = 0;
    } else {
      this.max = max;
      this.min = min;
      this.sum = sum;
      this.mean = sum / this.values.length;
    }
  }

  get maxBin() {
    return this.hist.reduce((a, b) => Math.max(a, b.count), 0);
  }

  @cached()
  private get boxplotData() {
    const s = this.values!.sort();
    this.values = null; // not needed anymore

    if (s.length === 0) {
      return {whiskerHigh: NaN, whiskerLow: NaN, outliers: [], median: NaN, q1: NaN, q3: NaN};
    }

    const median = quantile(s, 0.5)!;
    const q1 = quantile(s, 0.25)!;
    const q3 = quantile(s, 0.75)!;

    const iqr = q3 - q1;
    const left = q1 - 1.5 * iqr;
    const right = q3 + 1.5 * iqr;

    let outliers: number[] = [];
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
      outliers.push(v);
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

    outliers = outliers.concat(reversedOutliers.reverse());


    return {whiskerHigh, whiskerLow, outliers, median, q1, q3};
  }

  get median() {
    return this.boxplotData.median;
  }

  get q1() {
    return this.boxplotData.q1;
  }

  get q3() {
    return this.boxplotData.q3;
  }

  get whiskerLow() {
    return this.boxplotData.whiskerLow;
  }

  get whiskerHigh() {
    return this.boxplotData.whiskerHigh;
  }

  get outlier() {
    return this.boxplotData.outliers;
  }
}

/**
 * cache the value in a hidden __ variable
 * @internal
 */
function cached() {
  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const getter = descriptor.get!;
    const cacheKey = `__${propertyKey}`;
    descriptor.get = function (this: any) {
      if (this.hasOwnProperty(cacheKey)) {
        return this[cacheKey];
      }
      const value = getter.call(this);
      this[cacheKey] = value;
      return value;
    };
    return descriptor;
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
export function computeNormalizedStats(arr: ISequence<number>, numberOfBins?: number): IStatistics {

  const bins: INumberBin[] = [];

  const count = numberOfBins ? numberOfBins : getNumberOfBins(arr.length);
  let x0 = 0;
  const binWidth = 1. / count;
  for (let i = 0; i < count; ++i, x0 += binWidth) {
    bins.push({
      x0,
      x1: x0 + binWidth,
      count: 0
    });
  }

  const bin1 = 0 + binWidth;
  const binN = 1 - binWidth;
  const binEnds = bins.map((d) => d.x1);

  const toBin = (v: number) => {
    if (v < bin1) {
      return 0;
    }
    if (v >= binN) {
      return count - 1;
    }
    return bisectLeft(binEnds, v);
  };
  return new LazyBoxPlotData(arr, {bins, toBin});
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

export function computeDateState(arr: ISequence<Date | null>, template?: IDateStatistics): IDateStatistics {
  // filter out NaN
  let min: Date | null = null;
  let max: Date | null = null;
  let count = 0;
  let missing = 0;

  // yyyymmdd, count
  const byDay = new Map<number, number>();
  arr.forEach((v) => {
    count += 1;
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
export function computeHist(arr: ISequence<Set<ICategory> | null | ICategory>, categories: ICategory[]): ICategoricalStatistics {
  const m = new Map<string, number>();
  let missingCount = 0;
  categories.forEach((cat) => m.set(cat.name, 0));

  arr.forEach((vs) => {
    if (vs == null || (vs instanceof Set && vs.size === 0)) {
      missingCount += 1;
      return;
    }
    if (!(vs instanceof Set)) {
      m.set(vs.name, (m.get(vs.name) || 0) + 1);
      return;
    }
    vs.forEach((v) => {
      m.set(v.name, (m.get(v.name) || 0) + 1);
    });
  });

  const entries: {cat: string; count: number}[] = categories.map((d) => ({cat: d.name, count: m.get(d.name)!}));

  return {
    maxBin: entries.reduce((a, b) => Math.max(a, b.count), Number.NEGATIVE_INFINITY),
    hist: entries,
    missing: missingCount
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


export declare type IValueStatistics = ICategoricalStatistics | IDateStatistics | IStatistics;
