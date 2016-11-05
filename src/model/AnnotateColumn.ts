/**
 * Created by sam on 04.11.2016.
 */

import Column from './Column';
import StringColumn from './StringColumn';

/**
 * a string column in which the values can be edited locally
 */
export default class AnnotateColumn extends StringColumn {
  private annotations = new Map<number, string>();

  constructor(id:string, desc:any) {
    super(id, desc);
  }

  createEventList() {
    return super.createEventList().concat(['valueChanged']);
  }

  getValue(row:any) {
    if (this.annotations.has(row._index)) {
      return this.annotations.get(row._index);
    }
    return super.getValue(row);
  }

  dump(toDescRef:(desc:any) => any):any {
    var r = super.dump(toDescRef);
    r.annotations = {};
    this.annotations.forEach((v, k) => {
      r.annotations[k] = v;
    });
    return r;
  }

  restore(dump:any, factory:(dump:any) => Column) {
    super.restore(dump, factory);
    if (dump.annotations) {
      Object.keys(dump.annotations).forEach((k) => {
        this.annotations.set(Number(k), dump.annotations[k]);
      });
    }
  }

  setValue(row:any, value:string) {
    var old = this.getValue(row);
    if (old === value) {
      return true;
    }
    if (value === '' || value == null) {
      this.annotations.delete(row._index);
    } else {
      this.annotations.set(row._index, value);
    }
    this.fire(['valueChanged', 'dirtyValues', 'dirty'], row._index, old, value);
    return true;
  }
}
