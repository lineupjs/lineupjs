import {extent, range} from 'd3-array';
import {isNumberColumn, isSupportType, isMapAbleColumn} from '../model';
import Column, {IColumnDesc} from '../model/Column';
import {colorPool, MAX_COLORS} from '../model/internal';
import Ranking from '../model/Ranking';
import {timeParse} from 'd3-time-format';


export interface IDeriveOptions {
  /**
   * maximal percentage of unique values to be treated as a categorical column
   */
  categoricalThreshold: number | ((unique: number, total: number) => boolean);

  columns: string[];

  /**
   * date pattern to check for string matching them
   * @default %x
   */
  datePattern: string;
}

/**
 * @internal
 */
export function cleanCategories(categories: Set<string>) {
  // remove missing values
  categories.delete(<any>null);
  categories.delete(<any>undefined);
  categories.delete('');
  categories.delete('NA');
  categories.delete('NaN');
  categories.delete('na');

  return Array.from(categories).map(String).sort();
}

function hasDifferentSizes(data: any[][]) {
  if (data.length === 0) {
    return false;
  }
  const base = data[0].length;

  return data.some((d) => d != null && base !== (Array.isArray(d) ? d.length : -1));
}

function deriveType(label: string, value: any, column: number | string, all: ()=>any[], options: IDeriveOptions): IColumnDesc {
  const base: any = {
    type: 'string',
    label,
    column
  };
  if (value == null) {
    console.warn('cannot derive from null value for column: ', column);
    return base;
  }
  if (typeof value === 'number') {
    base.type = 'number';
    base.domain = extent(all());
    return base;
  }
  if (typeof value === 'boolean') {
    base.type = 'boolean';
    return base;
  }

  const dateParse = timeParse(options.datePattern);
  if (value instanceof Date || dateParse(value) != null) {
    base.type = 'date';
    return base;
  }
  const treatAsCategorical = typeof options.categoricalThreshold === 'function' ? options.categoricalThreshold : (u: number, t: number) => u < t * (<number>options.categoricalThreshold);

  if (typeof value === 'string') {
    //maybe a categorical
    const values = all();
    const categories = new Set(values);
    if (treatAsCategorical(categories.size, values.length)) {
      base.type = 'categorical';
      base.categories = cleanCategories(categories);
    }
    return base;
  }
  if (Array.isArray(value)) {
    base.type = 'strings';
    const values = all();
    if (!hasDifferentSizes(values)) {
      base.dataLength = value.length;
    }
    const first = value[0];
    if (typeof first === 'number') {
      base.type = 'numbers';
      base.domain = extent((<number[]>[]).concat(...values));
      return base;
    }
    if (typeof first === 'boolean') {
      base.type = 'booleans';
      return base;
    }
    if (first && (first instanceof Date || dateParse(String(first)) != null)) {
      base.type = 'dates';
      return base;
    }
    if (typeof first === 'string') {
      //maybe a categorical
      const categories = new Set((<string[]>[]).concat(...values));
      if (treatAsCategorical(categories.size, values.length)) {
        base.type = hasDifferentSizes(values) ? 'set' : 'categoricals';
        base.categories = cleanCategories(categories);
      }
      return base;
    }
  }
  console.log('cannot infer type of column:', column);
  //unknown type
  return base;
}

function toLabel(key: string | number) {
  if (typeof(key) === 'number') {
    return `Col ${key + 1}`;
  }
  key = key.trim();
  if (key.length === 0) {
    return 'Unknown';
  }
  return key.split(/[\s]+/gm).map((k) => k.length === 0 ? k : `${k[0]!.toUpperCase()}${k.slice(1)}`).join(' ');
}

export function deriveColumnDescriptions(data: any[], options: Partial<IDeriveOptions> = {}) {
  const config = Object.assign({
    categoricalThreshold: (u: number, n: number) => u <= MAX_COLORS && u < n * 0.7, //70% unique and less equal to 22 categories
    columns: [],
    datePattern: '%x'
  }, options);
  const r: IColumnDesc[] = [];
  if (data.length === 0) {
    // no data to derive something from
    return r;
  }
  const first = data[0];
  const columns: (number|string)[] = Array.isArray(first) ? range(first.length) : (config.columns.length > 0 ? config.columns : Object.keys(first));
  return columns.map((key) => {
    let v = first[key];
    if (v == null) {
      // cannot derive something from null try other rows
      const foundRow = data.find((row) => row[key] != null);
      v = foundRow ? foundRow[key] : null;
    }
    return deriveType(toLabel(key), v, key, () => data.map((d) => d[key]), config);
  });
}


/**
 * assigns colors to columns if they are numbers and not yet defined
 * @param columns
 * @returns {IColumnDesc[]}
 */
export function deriveColors(columns: IColumnDesc[]) {
  const colors = colorPool();
  columns.forEach((col: IColumnDesc) => {
    if (isMapAbleColumn(col)) {
      col.colorMapping = col.colorMapping || col.color || colors() || Column.DEFAULT_COLOR;
    }
  });
  return columns;
}


export interface IExportOptions {
  /**
   * export separator, default: '\t'
   */
  separator: string;
  /**
   * new line character, default: '\n'
   */
  newline: string;
  /**
   * should a header be generated, default: true
   */
  header: boolean;
  /**
   * quote strings, default: false
   */
  quote: boolean;
  /**
   * quote string to use, default: '"'
   */
  quoteChar: string;
  /**
   * filter specific column types, default: exclude all support types (selection, action, rank)
   * @param col the column description to filter
   */
  filter: (col: Column) => boolean; //!isSupportType

  /**
   * whether the description should be part of the column header
   */
  verboseColumnHeaders: boolean;
}

/**
 * utility to export a ranking to a table with the given separator
 * @param ranking
 * @param data
 * @param options
 * @returns {Promise<string>}
 */
export function exportRanking(ranking: Ranking, data: any[], options: Partial<IExportOptions> = {}) {
  const opts = <IExportOptions>Object.assign({
    separator: '\t',
    newline: '\n',
    header: true,
    quote: false,
    quoteChar: '"',
    filter: (c: Column) => !isSupportType(c),
    verboseColumnHeaders: false
  }, options);

  //optionally quote not numbers
  const escape = new RegExp(`[${opts.quoteChar}]`, 'g');

  function quote(v: any, c?: Column) {
    const l = String(v);
    if ((opts.quote || l.indexOf('\n') >= 0) && (!c || !isNumberColumn(c))) {
      return `${opts.quoteChar}${l.replace(escape, opts.quoteChar + opts.quoteChar)}${opts.quoteChar}`;
    }
    return l;
  }

  const columns = ranking.flatColumns.filter((c) => opts.filter(c));
  const order = ranking.getOrder();

  const r: string[] = [];
  if (opts.header) {
    r.push(columns.map((d) => quote(`${d.label}${opts.verboseColumnHeaders && d.description ? `\n${d.description}` : ''}`)).join(opts.separator));
  }
  data.forEach((row, i) => {
    r.push(columns.map((c) => quote(c.getExportValue({v: row, i: order[i]}, 'text'), c)).join(opts.separator));
  });
  return r.join(opts.newline);
}
