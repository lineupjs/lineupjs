import Column from '../model/Column';
import {DefaultCellRenderer} from './DefaultCellRenderer';
import BooleanColumn from '../model/BooleanColumn';

export default class BooleanCellRenderer extends DefaultCellRenderer {
  readonly title = 'Default';

  constructor() {
    super('boolean', 'center');
  }

  canRender(col: Column) {
    return col instanceof BooleanColumn;
  }
}
