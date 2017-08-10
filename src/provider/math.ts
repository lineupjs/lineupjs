/**
 * Created by Samuel Gratzl on 10.08.2017.
 */

import * as d3 from 'd3';
import {ICategoricalStatistics, IStatistics} from '../model/Column';
/**
 * computes the simple statistics of an array using d3 histogram
 * @param arr the data array
 * @param indices array data indices
 * @param acc accessor function
 * @param range the total value range
 * @returns {{min: number, max: number, count: number, hist: histogram.Bin<number>[]}}
 */
export function computeStats(arr: any[], indices: number[], acc: (row: any, index: number) => number, range?: [number, number]): IStatistics {
  if (arr.length === 0) {
    return {
      min: NaN,
      max: NaN,
      mean: NaN,
      count: 0,
      maxBin: 0,
      hist: []
    };
  }
  const indexAccessor = (a: any, i: number) => acc(a, indices[i]);
  const hist = d3.layout.histogram().value(indexAccessor);
  if (range) {
    hist.range(() => range);
  }
  const ex = d3.extent(arr, indexAccessor);
  const histData = hist(arr);
  return {
    min: ex[0],
    max: ex[1],
    mean: d3.mean(arr, indexAccessor),
    count: arr.length,
    maxBin: d3.max(histData, (d) => d.y),
    hist: histData
  };
}

/**
 * computes a categorical histogram
 * @param arr the data array
 * @param indices the data array data indices
 * @param acc the accessor
 * @param categories the list of known categories
 * @returns {{hist: {cat: string, y: number}[]}}
 */
export function computeHist(arr: number[], indices: number[], acc: (row: any, index: number) => string[], categories: string[]): ICategoricalStatistics {
  const m = new Map<string, number>();
  categories.forEach((cat) => m.set(cat, 0));

  arr.forEach((a, i) => {
    const vs = acc(a, indices[i]);
    if (vs == null) {
      return;
    }
    vs.forEach((v) => {
      m.set(v, (m.get(v) || 0) + 1);
    });
  });
  const entries: { cat: string; y: number }[] = [];
  m.forEach((v, k) => entries.push({cat: k, y: v}));
  return {
    maxBin: Math.max(...entries.map((d) => d.y)),
    hist: entries
  };
}
