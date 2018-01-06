import Column from './Column';
import {IDataRow} from './interfaces';
import StringColumn from './StringColumn';

/**
 * a string column in which the values can be edited locally
 */
export default class AnnotateColumn extends StringColumn {
  static readonly EVENT_VALUE_CHANGED = 'valueChanged';

  private readonly annotations = new Map<number, string>();

  protected createEventList() {
    return super.createEventList().concat([AnnotateColumn.EVENT_VALUE_CHANGED]);
  }

  getValue(row: IDataRow) {
    if (this.annotations.has(row.i)) {
      return this.annotations.get(row.i)!;
    }
    return super.getValue(row);
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.annotations = {};
    this.annotations.forEach((v, k) => {
      r.annotations[k] = v;
    });
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (!dump.annotations) {
      return;
    }
    Object.keys(dump.annotations).forEach((k) => {
      this.annotations.set(Number(k), dump.annotations[k]);
    });
  }

  setValue(row: IDataRow, value: string) {
    const old = this.getValue(row);
    if (old === value) {
      return true;
    }
    if (value === '' || value == null) {
      this.annotations.delete(row.i);
    } else {
      this.annotations.set(row.i, value);
    }
    this.fire([AnnotateColumn.EVENT_VALUE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], row.i, old, value);
    return true;
  }
}
