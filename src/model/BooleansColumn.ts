/**
 * Created by bikramkawan on 24/11/2016.
 */
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import {ICategoricalColumn} from './ICategoricalColumn';
import {FIRST_IS_NAN} from './missing';

export interface IBooleansDesc {
  readonly dataLength: number;
}

export declare type IBooleansColumnDesc = IValueColumnDesc<boolean[]> & IBooleansDesc;

export default class BooleansColumn extends ValueColumn<boolean[]> implements ICategoricalColumn {
  private readonly dataLength: number;
  readonly categories: string[];

  constructor(id: string, desc: IBooleansColumnDesc) {
    super(id, desc);
    this.dataLength = desc.dataLength;
    this.categories = [];
    for (let i = 0; i < this.dataLength; ++i) {
      this.categories.push(`Category #${i + 1}`);
    }

    this.setDefaultRenderer('upset');
  }

  get categoryLabels() {
    return this.categories;
  }

  get categoryColors() {
    return ['green', 'red'];
  }

  getCategories(row: any, index: number): string[] {
    const flagged = this.getValue(row, index);
    return this.categories.filter((_d, i) => flagged != null && flagged[i]);
  }

  getColor(row: any, index: number) {
    const flagged = this.getValue(row, index);
    return flagged ? 'green' : 'red';
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {

    const aVal = this.getValue(a, aIndex);
    const bVal = this.getValue(b, bIndex);
    if (aVal === null) {
      return bVal === null ? 0 : FIRST_IS_NAN;
    }
    if (bVal === null) {
      return FIRST_IS_NAN * -1;
    }

    const aCat = aVal.filter((x) => x).length;
    const bCat = bVal.filter((x) => x).length;
    return (aCat - bCat);
  }

  getDataLength() {
    return this.dataLength;
  }
}
