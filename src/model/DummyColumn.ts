/**
 * Created by sam on 04.11.2016.
 */

import Column, {IColumnDesc} from './Column';

/**
 * a default column with no values
 */
export default class DummyColumn extends Column {

  constructor(id: string, desc: IColumnDesc) {
    super(id, desc);
  }

  getLabel() {
    return '';
  }

  getValue() {
    return '';
  }

  compare() {
    return 0; //can't compare
  }
}
