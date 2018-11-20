import {Category, SupportType} from './annotations';
import Column from './Column';
import {IDataRow, IColumnDesc} from './interfaces';


/**
 * factory for creating a description creating a rank column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createRankDesc(label: string = 'Rank') {
  return {type: 'rank', label};
}

/**
 * emitted when the filter property changes
 * @asMemberOf StringColumn
 * @event
 */
export declare function filterChanged(previous: string | RegExp | null, current: string | RegExp | null): void;
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
    let offset = 0;
    for (const group of groups) {
      const rank = group.index2pos[row.i];
      if (typeof rank === 'number' && !isNaN(rank)) {
        return rank + 1 + offset; // starting with 1
      }
      offset += group.order.length;
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
