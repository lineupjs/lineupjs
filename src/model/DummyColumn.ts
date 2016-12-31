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

  getLabel(row: any) {
    return '';
  }

  getValue(row: any) {
    return '';
  }

  compare(a: any, b: any) {
    return 0; //can't compare
  }
}
