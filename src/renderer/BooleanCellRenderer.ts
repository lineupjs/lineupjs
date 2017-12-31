import BooleanColumn from '../model/BooleanColumn';
import Column from '../model/Column';
import {DefaultCellRenderer} from './DefaultCellRenderer';

export default class BooleanCellRenderer extends DefaultCellRenderer {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof BooleanColumn;
  }

  create(col: Column) {
    const r = super.create(col);
    r.template = `<div class="lu-center"> </div>`;
    return r;
  }
}
