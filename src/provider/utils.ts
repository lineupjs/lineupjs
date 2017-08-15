/**
 * Created by Samuel Gratzl on 15.08.2017.
 */
import {IColumnDesc} from '../model/Column';
import {extent} from 'd3';


export interface IDeriveOptions {
  /**
   * maximal percentage of unique values to be treated as a categorical column
   */
  categoricalThreshold: number;
}


function deriveType(label: string, value: any, column: number|string, data: any[], options: IDeriveOptions): IColumnDesc {
  const base: any = {
    type: 'string',
    label,
    column,
  };
  if (typeof value === 'number') {
    base.type = 'number';
    base.domain = extent(data, (d) => d[column]);
    return base;
  }
  if (typeof value === 'boolean') {
    base.type = 'boolean';
    return base;
  }
  if (typeof value === 'string') {
    //maybe a categorical
    const categories = new Set(data.map((d) => d[column]));
    if (categories.size < data.length * options.categoricalThreshold) { // 70% unique guess categorical
      base.type = 'categorical';
      base.categories = categories;
    }
    return base;
  }
  //unknown type
  return base;
}

export function deriveColumnDescriptions(data: any[], options: Partial<IDeriveOptions> = {}) {
  const config = Object.assign({
    categoricalThreshold: 0.7,
  }, options);
  const r: IColumnDesc[] = [];
  if (data.length === 0) {
    // no data to derive something from
    return r;
  }
  const first = data[0];
  if (Array.isArray(first)) {
    //array of arrays
    return first.map((v, i) => deriveType(`Col${i}`, v, i, data, config));
  }
  //objects
  return Object.keys(first).map((key) => deriveType(key, first[key], key, data, config));
}
