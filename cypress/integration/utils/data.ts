import {timeFormat} from 'd3-time-format';

export function rnd(seed = 0) {
  // Adapted from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
  if (seed === undefined) {
    seed = Date.now();
  }
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export interface IGenerateDataOptions {
  /**
   * @default 100
   */
  count?: number;

  /**
   * number of string columns
   * @default 1
   */
  string?: number;

  /**
   * number of number columns
   * @default 1
   */
  number?: number;

  /**
   * number of cat columns
   * @default 1
   */
  cat?: number;

  /**
   * @default ['c1', 'c2', 'c3']
   */
  categories?: string[];

  /**
   * number of date columns
   * @default 0
   */
  date?: number;

  seed?: number;

  /**
   * missing ratio
   * @default 0
   */
  missing?: number;
  /**
   * missing ratio
   * @default 0
   */
  missingString?: number;
  /**
   * missing ratio
   * @default 0
   */
  missingNumber?: number;
  /**
   * missing ratio
   * @default 0
   */
  missingCat?: number;
  /**
   * missing ratio
   * @default 0
   */
  missingDate?: number;
}

export const DEFAULT_CATEGORIES = ['c1', 'c2', 'c3'];

export function generateData(options: IGenerateDataOptions = {}) {
  const o: Required<IGenerateDataOptions> = Object.assign({
    count: 100,
    string: 1,
    number: 1,
    cat: 1,
    categories: DEFAULT_CATEGORIES,
    date: 0,
    seed: 0,
    missing: 0,
    missingString: options.missing == null ? 0 : options.missing,
    missingNumber: options.missing == null ? 0 : options.missing,
    missingCat: options.missing == null ? 0 : options.missing,
    missingDate: options.missing == null ? 0 : options.missing,
  }, options);
  const arr = [];
  const s = rnd(o.seed);
  const isMissing = (v: number) => v >= 0 && s() <= v;
  const f = timeFormat('%x');
  for (let i = 0; i < o.count; ++i) {
    let r: any = {};
    for (let j = 0; j < o.string; ++j) {
      const suffix = j === 0 ? '' : j;
      r[`string${suffix}`] = isMissing(o.missingString) ? null : `Row${suffix} ${i}`;
    }
    for (let j = 0; j < o.number; ++j) {
      r[`number${j === 0 ? '' : j}`] = isMissing(o.missingNumber) ? null : s() * 10;
    }
    for (let j = 0; j < o.cat; ++j) {
      r[`cat${j === 0 ? '' : j}`] = isMissing(o.missingCat) ? null : o.categories[Math.floor(s() * o.categories.length)];
    }
    for (let j = 0; j < o.date; ++j) {
      r[`date${j === 0 ? '' : j}`] = isMissing(o.missingDate) ? null : f(new Date(Date.now() - Math.floor(s() * 1000000000000)));
    }
    arr.push(r);
  };
  return arr;
}
