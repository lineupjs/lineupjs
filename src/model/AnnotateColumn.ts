/**
 * Created by sam on 04.11.2016.
 */

import {map as d3map} from 'd3';
import Column from './Column';
import StringColumn from './StringColumn';

/**
 * a string column in which the values can be edited locally
 */
export default class AnnotateColumn extends StringColumn {
  private annotations = d3map<string>();

  constructor(id:string, desc:any) {
    super(id, desc);
  }

  createEventList() {
    return super.createEventList().concat(['valueChanged']);
  }

  getValue(row:any) {
    var index = String(row._index);
    if (this.annotations.has(index)) {
      return this.annotations.get(index);
    }
    return super.getValue(row);
  }

  dump(toDescRef:(desc:any) => any):any {
    var r = super.dump(toDescRef);
    r.annotations = {};
    this.annotations.forEach((k, v) => {
      r.annotations[k] = v;
    });
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    super.restore(dump, factory);
    if (dump.annotations) {
      Object.keys(dump.annotations).forEach((k) => {
        this.annotations.set(k, dump.annotations[k]);
      });
    }
  }

  setValue(row:any, value:string) {
    var old = this.getValue(row);
    if (old === value) {
      return true;
    }
    if (value === '' || value == null) {
      this.annotations.remove(String(row._index));
    } else {
      this.annotations.set(String(row._index), value);
    }
    this.fire(['valueChanged', 'dirtyValues', 'dirty'], row._index, old, value);
    return true;
  }
}
