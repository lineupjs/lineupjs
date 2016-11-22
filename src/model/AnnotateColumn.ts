/**
 * Created by sam on 04.11.2016.
 */

import Column from './Column';
import StringColumn from './StringColumn';

/**
 * a string column in which the values can be edited locally
 */
export default class AnnotateColumn extends StringColumn {
  static EVENT_VALUE_CHANGED = 'valueChanged';

  private annotations = new Map<number, string>();

  constructor(id: string, desc: any) {
    super(id, desc);
  }

  protected createEventList() {
    return super.createEventList().concat([AnnotateColumn.EVENT_VALUE_CHANGED]);
  }

  getValue(row: any) {
    if (this.annotations.has(row._index)) {
      return this.annotations.get(row._index);
    }
    return super.getValue(row);
  }

  dump(toDescRef: (desc: any) => any): any {
    var r = super.dump(toDescRef);
    r.annotations = {};
    this.annotations.forEach((v, k) => {
      r.annotations[k] = v;
    });
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column) {
    super.restore(dump, factory);
    if (dump.annotations) {
      Object.keys(dump.annotations).forEach((k) => {
        this.annotations.set(Number(k), dump.annotations[k]);
      });
    }
  }

  setValue(row: any, value: string) {
    var old = this.getValue(row);
    if (old === value) {
      return true;
    }
    if (value === '' || value == null) {
      this.annotations.delete(row._index);
    } else {
      this.annotations.set(row._index, value);
    }
    this.fire([AnnotateColumn.EVENT_VALUE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], row._index, old, value);
    return true;
  }
}
