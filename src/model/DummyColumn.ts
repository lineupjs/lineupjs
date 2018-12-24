import Column from './Column';
import {IColumnDesc} from './interfaces';

/**
 * a default column with no values
 */
export default class DummyColumn extends Column {

  constructor(id: string, desc: Readonly<IColumnDesc>) {
    super(id, desc);
  }

  getLabel() {
    return '';
  }

  getValue() {
    return '';
  }
}
