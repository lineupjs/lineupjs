import {ascending, histogram, mean, median, quantile} from 'd3-array';
import {ICategory, isMissingValue} from '../model';
import {IMappingFunction} from '../model/MappingFunction';

export interface INumberBin {
  x0: number;
  x1: number;
  length: number;
}

export interface IBoxPlotData {
  readonly min: number;
  readonly max: number;
  readonly median: number;
  readonly q1: number;
  readonly q3: number;
  readonly outlier?: number[];
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
  y: number;
}

export interface ICategoricalStatistics {
  readonly maxBin: number;
  readonly hist: ICategoricalBin[];
  readonly missing: number;
}

/**
 * @internal
 * @param {number} length
 * @returns {number}
 */
export function getNumberOfBins(length: number) {
  // as by default used in d3 the Sturges' formula
  return Math.ceil(Math.log(length) / Math.LN2) + 1;
}


/**
 * helper class to lazily compute box plotdata out of a given number array
 * @internal
 */
export class LazyBoxPlotData implements IStatistics {
  private readonly values: number[];

  readonly missing: number;

  constructor(values: number[], private readonly scale?: Readonly<IMappingFunction>, private readonly histGen?: (data: number[]) => INumberBin[]) {
    // filter out NaN
    this.values = values.filter((d) => !isMissingValue(d));
    this.missing = values.length - this.values.length;
  }

  get count() {
    return this.values.length + this.missing;
  }

  /**
   * lazy compute sorted array
   * @returns {number[]}
   */
  @cached()
  private get sorted(): number[] {
    return this.values.slice().sort(ascending);
  }

  private map(v: number | undefined) {
    return this.scale && v != null ? this.scale.apply(v!) : v!;
  }

  @cached()
  get hist() {
    if (!this.histGen) {
      return [];
    }
    return this.histGen(this.values);
  }

  @cached()
  get maxBin() {
    return Math.max(...this.hist.map((d) => d.length));
  }

  @cached()
  get min() {
    return this.map(Math.min(...this.values));
  }

  @cached()
  get max() {
    return this.map(Math.max(...this.values));
  }

  @cached()
  get median() {
    return this.map(median(this.sorted));
  }

  @cached()
  get q1() {
    return this.map(quantile(this.sorted, 0.25));
  }

  @cached()
  get q3() {
    return this.map(quantile(this.sorted, 0.75));
  }

  @cached()
  get mean() {
    return this.map(mean(this.values));
  }

  @cached()
  get outlier() {
    const q1 = this.q1;
    const q3 = this.q3;
    const iqr = q3 - q1;
    const left = q1 - 1.5 * iqr;
    const right = q3 + 1.5 * iqr;
    let outlier = this.sorted.filter((v) => (v < left || v > right) && !isMissingValue(v));
    if (this.scale) {
      outlier = outlier.map((v) => this.scale!.apply(v));
    }
    return outlier;
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
 * @param missing accessor if the value is missing
 * @param range the total value range
 * @param bins the number of bins
 * @returns {{min: number, max: number, count: number, hist: histogram.Bin<number>[]}}
 * @internal
 */
export function computeStats<T>(arr: T[], acc: (row: T) => number, missing: (row: T) => boolean, range?: [number, number], bins?: number): IStatistics {
  if (arr.length === 0) {
    return {
      min: NaN,
      max: NaN,
      mean: NaN,
      q1: NaN,
      q3: NaN,
      outlier: [],
      median: NaN,
      count: 0,
      maxBin: 0,
      hist: [],
      missing: 0
    };
  }

  const hist = histogram();
  if (range) {
    hist.domain(range);
  }
  if (bins) {
    hist.thresholds(bins);
  } else {
    hist.thresholds(getNumberOfBins(arr.length));
  }

  const values = arr.map((v) => missing(v) ? NaN : acc(v));

  return new LazyBoxPlotData(values, undefined, <(data: number[]) => INumberBin[]>hist);
}


/**
 * computes a categorical histogram
 * @param arr the data array
 * @param acc the accessor
 * @param categories the list of known categories
 * @returns {{hist: {cat: string, y: number}[]}}
 * @internal
 */
export function computeHist<T>(arr: T[], acc: (row: T) => ICategory | null, categories: ICategory[]): ICategoricalStatistics {
  const m = new Map<string, number>();
  let missingCount = 0;
  categories.forEach((cat) => m.set(cat.name, 0));

  arr.forEach((a) => {
    const v = acc(a);
    if (v == null) {
      missingCount += 1;
      return;
    }
    m.set(v.name, (m.get(v.name) || 0) + 1);
  });
  const entries: { cat: string; y: number }[] = [];
  m.forEach((v, k) => entries.push({cat: k, y: v}));
  return {
    maxBin: Math.max(...entries.map((d) => d.y)),
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
