import BooleanColumn from '../model/BooleanColumn';
import Column from '../model/Column';
import {DefaultCellRenderer} from './DefaultCellRenderer';
import {ERenderMode, ICellRenderer} from './interfaces';

export default class BooleanCellRenderer extends DefaultCellRenderer {
  readonly title: string = 'Default';

  canRender(col: Column, mode: ERenderMode): boolean {
    return col instanceof BooleanColumn && mode === ERenderMode.CELL;
  }

  create(col: Column): ICellRenderer {
    const r = super.create(col);
    (<any>r).template = `<div class="lu-center"> </div>`;
    return r;
  }
}
