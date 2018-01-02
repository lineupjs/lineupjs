import ArrayColumn, {IArrayColumnDesc} from './ArrayColumn';
import {ICategoricalColumn} from './ICategoricalColumn';
import {IDataRow} from './interfaces';
import {FIRST_IS_NAN} from './missing';

export declare type IBooleansColumnDesc = IArrayColumnDesc<boolean>;

export default class BooleansColumn extends ArrayColumn<boolean> implements ICategoricalColumn {
  constructor(id: string, desc: IBooleansColumnDesc) {
    super(id, desc);
    this.setDefaultRenderer('upset');
  }

  get categories() {
    return this.labels;
  }

  get categoryLabels() {
    return this.categories;
  }

  get categoryColors() {
    return ['green', 'red'];
  }

  getCategories(row: IDataRow): string[] {
    const flagged = this.getValue(row);
    return this.categories.filter((_d, i) => flagged != null && flagged[i]);
  }

  getColor(row: IDataRow) {
    const flagged = this.getValue(row);
    return flagged.reduce((a,b) => a + (b ? 1 : 0), 0) >= flagged.length/2 ? 'green' : 'red';
  }

  compare(a: IDataRow, b: IDataRow) {
    const aVal = this.getValue(a);
    const bVal = this.getValue(b);
    if (aVal == null) {
      return bVal == null ? 0 : FIRST_IS_NAN;
    }
    if (bVal == null) {
      return FIRST_IS_NAN * -1;
    }

    const aCat = aVal.filter((x) => x).length;
    const bCat = bVal.filter((x) => x).length;
    return (aCat - bCat);
  }
}
