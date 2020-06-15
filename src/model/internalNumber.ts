import {format} from 'd3-format';
import {IBoxPlotData, similar, ISequence, IAdvancedBoxPlotData, boxplotBuilder} from '../internal';
import {FIRST_IS_NAN, IDataRow, IBoxPlotColumn, INumberFilter, INumberColumn} from '.';


/** @internal */
export const DEFAULT_FORMATTER = format('.3n');

/** @internal */
export function compareBoxPlot(col: IBoxPlotColumn, a: IDataRow, b: IDataRow) {
  const aVal = col.getBoxPlotData(a);
  const bVal = col.getBoxPlotData(b);
  const method = <keyof IBoxPlotData>col.getSortMethod();
  if (aVal == null) {
    return bVal == null ? 0 : FIRST_IS_NAN;
  }
  if (bVal == null) {
    return FIRST_IS_NAN * -1;
  }
  return numberCompare(<number>aVal[method], <number>bVal[method]);
}

export function toCompareBoxPlotValue(col: IBoxPlotColumn, row: IDataRow) {
  const v = col.getBoxPlotData(row);
  const method = <keyof IBoxPlotData>col.getSortMethod();
  return v == null ? NaN : <number>v[method];
}

export function getBoxPlotNumber(col: IBoxPlotColumn, row: IDataRow, mode: 'raw' | 'normalized'): number {
  const data = mode === 'normalized' ? col.getBoxPlotData(row) : col.getRawBoxPlotData(row);
  if (data == null) {
    return NaN;
  }
  return <number>data[<keyof IBoxPlotData>col.getSortMethod()];
}
/**
 * save number comparison
 * @param a
 * @param b
 * @param aMissing
 * @param bMissing
 * @return {number}
 * @internal
 */
export function numberCompare(a: number | null, b: number | null, aMissing = false, bMissing = false) {
  aMissing = aMissing || a == null || isNaN(a);
  bMissing = bMissing || b == null || isNaN(b);
  if (aMissing) { //NaN are smaller
    return bMissing ? 0 : FIRST_IS_NAN;
  }
  if (bMissing) {
    return FIRST_IS_NAN * -1;
  }
  return a! - b!;
}

/** @internal */
export function noNumberFilter() {
  return ({min: -Infinity, max: Infinity, filterMissing: false});
}

/** @internal */
export function isEqualNumberFilter(a: INumberFilter, b: INumberFilter) {
  return similar(a.min, b.min, 0.001) && similar(a.max, b.max, 0.001) && a.filterMissing === b.filterMissing;
}

/** @internal */
export function isNumberIncluded(filter: INumberFilter | null, value: number) {
  if (!filter) {
    return true;
  }
  if (isNaN(value)) {
    return !filter.filterMissing;
  }
  return !((isFinite(filter.min) && value < filter.min) || (isFinite(filter.max) && value > filter.max));
}

/** @internal */
export function isDummyNumberFilter(filter: INumberFilter) {
  return !filter.filterMissing && !isFinite(filter.min) && !isFinite(filter.max);
}

/** @internal */
export function restoreNumberFilter(v: INumberFilter): INumberFilter {
  return {
    min: v.min != null && isFinite(v.min) ? v.min : -Infinity,
    max: v.max != null && isFinite(v.max) ? v.max : +Infinity,
    filterMissing: v.filterMissing
  };
}


/** @internal */
export function medianIndex(rows: ISequence<IDataRow>, col: INumberColumn) {
  //return the median row
  const data = rows.map((r, i) => ({r, i, v: col.getNumber(r)}));
  const sorted = Array.from(data.filter((r) => !isNaN(r.v))).sort((a, b) => numberCompare(a.v, b.v));
  const index = sorted[Math.floor(sorted.length / 2.0)];
  if (index === undefined) {
    return {index: 0, row: sorted[0]!.r}; //error case
  }
  return {index: index.i, row: index.r};
}

/** @internal */
export function toCompareGroupValue(rows: ISequence<IDataRow>, col: INumberColumn, sortMethod: keyof IAdvancedBoxPlotData, valueCache?: ISequence<number>) {
  const b = boxplotBuilder();
  if (valueCache) {
    b.pushAll(valueCache);
  } else {
    b.pushAll(rows.map((d) => col.getNumber(d)));
  }
  const vs = b.build();
  return <number>vs[sortMethod];
}
