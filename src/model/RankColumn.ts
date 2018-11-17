import {IDataRow} from './interfaces';
import {Category, SupportType} from './annotations';
import Column, {IColumnDesc} from './Column';

/**
 * factory for creating a description creating a rank column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createRankDesc(label: string = 'Rank') {
  return {type: 'rank', label};
}

/**
 * a rank column
 */
@SupportType()
@Category('support')
export default class RankColumn extends Column {

  constructor(id: string, desc: IColumnDesc) {
    super(id, desc);
    this.setDefaultWidth(50);
  }

  getLabel(row: IDataRow) {
    return String(this.getValue(row));
  }

  getRaw(row: IDataRow) {
    const ranking = this.findMyRanker();
    if (!ranking) {
      return -1;
    }
    const groups = ranking.getGroups();
    for (const group of groups) {
      const rank = group.index2pos[row.i];
      if (typeof rank === 'number') {
        return rank + 1; // starting with 1
      }
    }
    return -1;
  }

  getValue(row: IDataRow) {
    const r = this.getRaw(row);
    return r === -1 ? null : r;
  }

  get frozen() {
    return this.desc.frozen !== false;
  }
}
