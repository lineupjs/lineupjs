import {Column, BooleanColumn} from '../model';
import {DefaultCellRenderer} from './DefaultCellRenderer';
import {ERenderMode, ICellRenderer} from './interfaces';
import {cssClass} from '../styles';

/** @internal */
export default class BooleanCellRenderer extends DefaultCellRenderer {
  readonly title: string = 'Default';

  canRender(col: Column, mode: ERenderMode): boolean {
    return col instanceof BooleanColumn && mode === ERenderMode.CELL;
  }

  create(col: Column): ICellRenderer {
    const r = super.create(col);
    (<any>r).template = `<div class="${cssClass('center')}"> </div>`;
    return r;
  }
}
