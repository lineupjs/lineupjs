import {Column} from '../../model';
import {createToolbarMenuItems, updateIconState} from '../header';
import {IRankingHeaderContext} from '../interfaces';
import ADialog, {IDialogContext} from './ADialog';
import {cssClass} from '../../styles';

/** @internal */
export default class MoreColumnOptionsDialog extends ADialog {

  constructor(private readonly column: Column, dialog: IDialogContext, private readonly ctx: IRankingHeaderContext) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    node.classList.add(cssClass('more-options'));
    createToolbarMenuItems(node, this.dialog.level + 1, this.column, this.ctx);

    updateIconState(node, this.column);
  }
}
