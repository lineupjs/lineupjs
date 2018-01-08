import {Category, SupportType} from './annotations';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';

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
export default class RankColumn extends ValueColumn<number> {

  constructor(id: string, desc: IValueColumnDesc<number>) {
    super(id, desc);
    this.setDefaultWidth(50);
  }

  get frozen() {
    return this.desc.frozen !== false;
  }
}
