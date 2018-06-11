import BooleanColumn from '../model/BooleanColumn';
import Column from '../model/Column';
import {DefaultCellRenderer} from './DefaultCellRenderer';
import {ERenderMode} from './interfaces';

/** @internal */
export default class BooleanCellRenderer extends DefaultCellRenderer {
  readonly title = 'Default';

  canRender(col: Column, mode: ERenderMode) {
    return col instanceof BooleanColumn && mode === ERenderMode.CELL;
  }

  create(col: Column) {
    const r = super.create(col);
    (<any>r).template = `<div class="lu-center"> </div>`;
    return r;
  }
}
