import {Ranking, isNumberColumn, Column, IColumnDesc, isSupportType, isMapAbleColumn, DEFAULT_COLOR} from '../model';
import {colorPool, MAX_COLORS} from '../model/internal';
import {concat, equal, extent, range} from '../internal';
import {timeParse} from 'd3-time-format';
import {IDataProvider, IDeriveOptions, IExportOptions} from './interfaces';


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

function isEmpty(v: any) {
  return v == null || (Array.isArray(v) && v.length === 0) || (v instanceof Set && v.size === 0) || (v instanceof Map && v.size === 0) || equal({}, v);
}

function deriveBaseType(value: any, all: () => any[], column: number | string, options: IDeriveOptions) {
  if (value == null) {
    console.warn('cannot derive from null value for column: ', column);
    return null;
  }
  // primitive
  if (typeof value === 'number') {
    return {
      type: 'number',
      domain: extent(all())
    };
  }
  if (typeof value === 'boolean') {
    return {
      type: 'boolean'
    };
  }

  const dateParse = timeParse(options.datePattern);
  if (value instanceof Date || dateParse(value) != null) {
    return {
      type: 'date'
    };
  }
  const treatAsCategorical = typeof options.categoricalThreshold === 'function' ? options.categoricalThreshold : (u: number, t: number) => u < t * (<number>options.categoricalThreshold);

  if (typeof value === 'string') {
    //maybe a categorical
    const values = all();
    const categories = new Set(values);
    if (treatAsCategorical(categories.size, values.length)) {
      return {
        type: 'categorical',
        categories: cleanCategories(categories)
      };
    }
    return {
      type: 'string'
    };
  }

  if (typeof value === 'object' && value.alt != null && value.href != null) {
    return {
      type: 'link'
    };
  }

  return null;
}

function deriveType(label: string, value: any, column: number | string, all: () => any[], options: IDeriveOptions): IColumnDesc {
  const base: any = {
    type: 'string',
    label,
    column
  };

  const primitive = deriveBaseType(value, all, column, options);
  if (primitive != null) {
    return Object.assign(base, primitive);
  }

  // set
  if (value instanceof Set) {
    const cats = new Set<string>();
    for (const value of all()) {
      if (!(value instanceof Set)) {
        continue;
      }
      value.forEach((vi) =>  {
        cats.add(String(vi));
      });
    }
    return Object.assign(base, {
      type: 'set',
      categories: cleanCategories(cats)
    });
  }

  // map
  if (value instanceof Map) {
    const first = Array.from(value.values()).find((d) => !isEmpty(d));
    const mapAll = () => {
      const r: any[] = [];
      for (const vi of all()) {
        if (!(vi instanceof Map)) {
          continue;
        }
        vi.forEach((vii) => {
          if (!isEmpty(vii)) {
            r.push(vii);
          }
        });
      }
      return r;
    };
    const p = deriveBaseType(first, mapAll, column, options);
    return Object.assign(base, p || {}, {
      type: p ? `${p.type}Map` : 'stringMap'
    });
  }

  // array
  if (Array.isArray(value)) {
    const values = all();
    const sameLength = !hasDifferentSizes(values);
    if (sameLength) {
      base.dataLength = value.length;
    }
    const first = value.find((v) => !isEmpty(v));
    const p = deriveBaseType(first, () => concat(values).filter((d) => !isEmpty(d)), column, options);
    if (p && p.type === 'categorical' && !sameLength) {
      return Object.assign(base, p, {
        type : 'set'
      });
    }
    if (p || isEmpty(first)) {
      return Object.assign(base, p || {}, {
        type: p ? `${p.type}s` : 'strings'
      });
    }

    if (typeof first === 'object' && first.key != null && first.value != null) {
      // key,value pair map
      const mapAll = () => {
        const r: any[] = [];
        for (const vi of values) {
          if (!Array.isArray(vi)) {
            continue;
          }
          for (const vii of vi) {
            if (!isEmpty(vii)) {
              r.push(vii);
            }
          }
        }
        return r;
      };
      const p = deriveBaseType(first.value, mapAll, column, options);
      return Object.assign(base, p || {}, {
        type: p ? `${p.type}Map` : 'stringMap'
      });
    }
  }

  // check boxplot
  const bs = ['min', 'max', 'median', 'q1', 'q3'];
  if (typeof value === 'object' && bs.every((b) => typeof value[b] === 'number')) {
    //  boxplot
    const vs = all();
    return Object.assign(base, {
      type: 'boxplot',
      domain: [
        vs.reduce((a, b) => Math.min(a, b.min), Number.POSITIVE_INFINITY),
        vs.reduce((a, b) => Math.max(a, b.max), Number.NEGATIVE_INFINITY)
      ]
    });
  }

  if (typeof value === 'object') {
    // object map
    const first = Object.keys(value).map((k) => value[k]).filter((d) => !isEmpty(d));
    const mapAll = () => {
      const r: any[] = [];
      for (const vi of all()) {
        if (vi == null) {
          continue;
        }
        Object.keys(vi).forEach((k) => {
          const vii = vi[k];
          if (!isEmpty(vii)) {
            r.push(vii);
          }
        });
      }
      return r;
    };
    const p = deriveBaseType(first, mapAll, column, options);
    return Object.assign(base, p || {}, {
      type: p ? `${p.type}Map` : 'stringMap'
    });
  }

  console.log('cannot infer type of column:', column);
  //unknown type
  return base;
}

function selectColumns(existing: string[], columns: string[]) {
  const allNots = columns.every((d) => d.startsWith('-'));
  if (!allNots) {
    return columns;
  }
  // negate case, exclude columns that are given using -notation
  const exclude = new Set(columns);
  return existing.filter((d) => !exclude.has(`-${d}`));
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
  const columns: (number|string)[] = Array.isArray(first) ? range(first.length) : (config.columns.length > 0 ? selectColumns(Object.keys(first), config.columns) : Object.keys(first));

  return columns.map((key) => {
    let v = first[key];
    if (isEmpty(v)) {
      // cannot derive something from null try other rows
      const foundRow = data.find((row) => !isEmpty(row[key]));
      v = foundRow ? foundRow[key] : null;
    }
    return deriveType(toLabel(key), v, key, () => data.map((d) => d[key]).filter((d) => !isEmpty(d)), config);
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
      col.colorMapping = col.colorMapping || col.color || colors() || DEFAULT_COLOR;
    }
  });
  return columns;
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


/** @internal */
export function map2Object<T>(map: Map<string, T>) {
  const r : { [key: string]: T} = {};
  map.forEach((v, k) => r[k] = v);
  return r;
}

/** @internal */
export function object2Map<T>(obj: { [key: string]: T}) {
  const r = new Map<string, T>();
  for (const k of Object.keys(obj)) {
    r.set(k, obj[k]);
  }
  return r;
}


/** @internal */
export function rangeSelection(provider: IDataProvider, rankingId: string, dataIndex: number, relIndex: number, ctrlKey: boolean) {
  const ranking = provider.getRankings().find((d) => d.id === rankingId);
  if (!ranking) { // no known reference
    return false;
  }
  const selection = provider.getSelection();
  if (selection.length === 0 || selection.includes(dataIndex)) {
    return false; // no other or deselect
  }
  const order = ranking.getOrder();
  const lookup = new Map(Array.from(order).map((d, i) => <[number, number]>[d, i]));
  const distances = selection.map((d) => {
    const index = (lookup.has(d) ? lookup.get(d)! : Infinity);
    return {s: d, index, distance: Math.abs(relIndex - index)};
  });
  const nearest = distances.sort((a, b) => a.distance - b.distance)[0]!;
  if (!isFinite(nearest.distance)) {
    return false; // all outside
  }
  if (!ctrlKey) {
    selection.splice(0, selection.length);
    selection.push(nearest.s);
  }
  if (nearest.index < relIndex) {
    for (let i = nearest.index + 1; i <= relIndex; ++i) {
      selection.push(order[i]);
    }
  } else {
    for (let i = relIndex; i <= nearest.index; ++i) {
      selection.push(order[i]);
    }
  }
  provider.setSelection(selection);
  return true;
}
