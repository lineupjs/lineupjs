import {Column, BooleanColumn} from '../model';
import {DefaultCellRenderer} from './DefaultCellRenderer';
import {ERenderMode} from './interfaces';
import {cssClass} from '../styles';

/** @internal */
export default class BooleanCellRenderer extends DefaultCellRenderer {
  readonly title = 'Default';

  canRender(col: Column, mode: ERenderMode) {
    return col instanceof BooleanColumn && mode === ERenderMode.CELL;
  }

  create(col: Column) {
    const r = super.create(col);
    (<any>r).template = `<div class="${cssClass('center')}"> </div>`;
    return r;
  }
}
