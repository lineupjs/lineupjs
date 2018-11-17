import ArrayColumn, {IArrayColumnDesc} from './ArrayColumn';
import {ISetColumn, toCategory} from './ICategoricalColumn';
import {IDataRow} from './interfaces';

export declare type IBooleansColumnDesc = IArrayColumnDesc<boolean>;

export default class BooleansColumn extends ArrayColumn<boolean> implements ISetColumn {
  constructor(id: string, desc: Readonly<IBooleansColumnDesc>) {
    super(id, desc);
    this.setDefaultRenderer('upset');
  }

  get categories() {
    return this.labels.map((d, i) => toCategory(d, i));
  }

  getSet(row: IDataRow) {
    const vs = this.getValues(row);
    return new Set(this.categories.filter((_, i) => vs[i]));
  }

  toCompareValue(row: IDataRow) {
    const v = this.getValue(row);
    if (v == null) {
      return NaN;
    }
    return v.reduce((a, b) => a +(b ? 1 : 0), 0);
  }
}
