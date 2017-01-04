/**
 * Created by sam on 04.11.2016.
 */


import ValueColumn, {IValueColumnDesc} from './ValueColumn';

/**
 * factory for creating a description creating a rank column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'Rank') {
  return {type: 'rank', label};
}

/**
 * a rank column
 */
export default class RankColumn extends ValueColumn<number> {

  constructor(id: string, desc: IValueColumnDesc<number>) {
    super(id, desc);
    this.setWidthImpl(50);
  }
}
