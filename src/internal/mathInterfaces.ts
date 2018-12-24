import * as equalImpl from 'fast-deep-equal';

// keep here to have a "real" export for webpack not just interfaces

/**
 * deep equal comparison
 */
export const equal: (a: any, b: any) => boolean = (typeof equalImpl === 'function' ? equalImpl : (<any>equalImpl).default);


export interface INumberBin {
  /**
   * bin start
   */
  x0: number;
  /**
   * bin end
   */
  x1: number;
  /**
   * bin count
   */
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

  readonly missing: number;
  readonly count: number;

  readonly maxBin: number;
  readonly hist: ReadonlyArray<INumberBin>;
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
  readonly missing: number;
  readonly count: number;

  readonly maxBin: number;
  readonly hist: ReadonlyArray<ICategoricalBin>;
}

export declare type IDateHistGranularity = 'year' | 'month' | 'day';

export interface IDateStatistics {
  readonly min: Date | null;
  readonly max: Date | null;

  readonly missing: number;
  readonly count: number;

  readonly maxBin: number;
  readonly histGranularity: IDateHistGranularity;
  readonly hist: ReadonlyArray<IDateBin>;
}
