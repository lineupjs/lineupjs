import Column from '../../model/Column';
import {createToolbarMenuItems, updateIconState} from '../header';
import {IRankingHeaderContext} from '../interfaces';
import ADialog, {IDialogContext} from './ADialog';

/** @internal */
export default class MoreColumnOptionsDialog extends ADialog {

  constructor(private readonly column: Column, dialog: IDialogContext, private readonly ctx: IRankingHeaderContext) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    node.classList.add('lu-more-options');
    createToolbarMenuItems(node, this.dialog.level + 1, this.column, this.ctx);

    updateIconState(node, this.column);
  }
}
