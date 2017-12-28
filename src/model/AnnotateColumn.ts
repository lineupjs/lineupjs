/**
 * Created by sam on 04.11.2016.
 */

import Column from './Column';
import StringColumn, {IStringColumnDesc} from './StringColumn';
import {IDataRow} from './interfaces';

/**
 * a string column in which the values can be edited locally
 */
export default class AnnotateColumn extends StringColumn {
  static readonly EVENT_VALUE_CHANGED = 'valueChanged';

  private readonly annotations = new Map<number, string>();

  constructor(id: string, desc: IStringColumnDesc) {
    super(id, desc);
  }

  protected createEventList() {
    return super.createEventList().concat([AnnotateColumn.EVENT_VALUE_CHANGED]);
  }

  getValue(row: IDataRow) {
    if (this.annotations.has(row.dataIndex)) {
      return this.annotations.get(row.dataIndex)!;
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
      this.annotations.delete(row.dataIndex);
    } else {
      this.annotations.set(row.dataIndex, value);
    }
    this.fire([AnnotateColumn.EVENT_VALUE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], row.dataIndex, old, value);
    return true;
  }
}
