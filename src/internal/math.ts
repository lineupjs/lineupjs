/**
 * Created by Samuel Gratzl on 10.08.2017.
 */

import {extent, histogram, mean} from 'd3-array';

export interface INumberBin {
  x0: number;
  x1: number;
  length: number;
}

export interface IStatistics {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
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

export function getNumberOfBins(length: number) {
  // as by default used in d3 the Sturges' formula
  return Math.ceil(Math.log(length) / Math.LN2) + 1;
}

/**
 * computes the simple statistics of an array using d3 histogram
 * @param arr the data array
 * @param acc accessor function
 * @param missing accessor if the value is missing
 * @param range the total value range
 * @param bins the number of bins
 * @returns {{min: number, max: number, count: number, hist: histogram.Bin<number>[]}}
 */
export function computeStats<T>(arr: T[], acc: (row: T) => number, missing: (row: T) => boolean, range?: [number, number], bins?: number): IStatistics {
  if (arr.length === 0) {
    return {
      min: NaN,
      max: NaN,
      mean: NaN,
      count: 0,
      maxBin: 0,
      hist: [],
      missing: 0
    };
  }

  let missingCount = 0;
  const vs = arr.map((a) => {
    if (missing(a)) {
      return NaN;
    }
    return acc(a);
  }).reduce((acc, act) => {
    if (isNaN(act)) {
      missingCount++;
    } else {
      acc.push(act);
    }
    return acc;
  }, <number[]>[]);

  const hist = histogram();
  if (range) {
    hist.domain(range);
  }
  if (bins) {
    hist.thresholds(bins);
  } else {
    hist.thresholds(getNumberOfBins(arr.length));
  }
  const ex = extent(vs);
  const histData = hist(vs);
  return {
    min: ex[0]!,
    max: ex[1]!,
    mean: mean(vs)!,
    count: arr.length,
    maxBin: Math.max(...histData.map((d) => d.length)),
    hist: histData,
    missing: missingCount
  };
}

/**
 * computes a categorical histogram
 * @param arr the data array
 * @param acc the accessor
 * @param categories the list of known categories
 * @returns {{hist: {cat: string, y: number}[]}}
 */
export function computeHist<T>(arr: T[], acc: (row: T) => string, categories: string[]): ICategoricalStatistics {
  const m = new Map<string, number>();
  let missingCount = 0;
  categories.forEach((cat) => m.set(cat, 0));

  arr.forEach((a) => {
    const v = acc(a);
    if (v == null) {
      missingCount += 1;
      return;
    }m.set(v, (m.get(v) || 0) + 1);
  });
  const entries: { cat: string; y: number }[] = [];
  m.forEach((v, k) => entries.push({cat: k, y: v}));
  return {
    maxBin: Math.max(...entries.map((d) => d.y)),
    hist: entries,
    missing: missingCount
  };
}


export function round(v: number, precision: number = 0) {
  if (precision === 0) {
    return Math.round(v);
  }
  const scale = Math.pow(10, precision);
  return Math.round(v * scale) / scale;
}

export function similar(a: number, b: number, delta = 0.5) {
  if (a === b) {
    return true;
  }
  return Math.abs(a - b) < delta;
}
