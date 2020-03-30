import {Column} from '../../model';
import {createToolbarMenuItems, updateIconState} from '../header';
import {IRankingHeaderContext} from '../interfaces';
import {IDialogContext} from './ADialog';
import {cssClass} from '../../styles';
import APopup from './APopup';

/** @internal */
export default class MoreColumnOptionsDialog extends APopup {

  constructor(private readonly column: Column, dialog: IDialogContext, private readonly ctx: IRankingHeaderContext) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    node.classList.add(cssClass('more-options'));
    node.dataset.colId = this.column.id;
    createToolbarMenuItems(node, this.dialog.level + 1, this.column, this.ctx);

    updateIconState(node, this.column);
  }
}
