import ArrayColumn, {IArrayColumnDesc} from './ArrayColumn';
import {ISetColumn, toCategory} from './ICategoricalColumn';
import {IDataRow} from './interfaces';
import {FIRST_IS_MISSING} from './missing';

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

  compare(a: IDataRow, b: IDataRow) {
    const aVal = this.getValue(a);
    const bVal = this.getValue(b);
    if (aVal == null) {
      return bVal == null ? 0 : FIRST_IS_MISSING;
    }
    if (bVal == null) {
      return -FIRST_IS_MISSING;
    }

    const aCat = aVal.filter((x) => x).length;
    const bCat = bVal.filter((x) => x).length;
    return (aCat - bCat);
  }
}
