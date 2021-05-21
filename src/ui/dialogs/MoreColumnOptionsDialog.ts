import type { Column } from '../../model';
import { createToolbarMenuItems, updateIconState } from '../headerTooltip';
import type { IRankingHeaderContext } from '../interfaces';
import type { IDialogContext } from './ADialog';
import { cssClass } from '../../styles';
import APopup from './APopup';

/** @internal */
export default class MoreColumnOptionsDialog extends APopup {
  constructor(
    private readonly column: Column,
    dialog: IDialogContext,
    private readonly mode: 'header' | 'sidePanel',
    private readonly ctx: IRankingHeaderContext
  ) {
    super(dialog, {
      autoClose: true,
    });
  }

  protected build(node: HTMLElement) {
    node.classList.add(cssClass('more-options'));
    node.dataset.colId = this.column.id;
    createToolbarMenuItems(node, this.dialog.level + 1, this.column, this.ctx, this.mode);

    updateIconState(node, this.column);
  }
}
