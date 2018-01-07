import Column from '../../model/Column';
import {addIconDOM, createToolbarMenuItems} from '../header';
import {IRankingHeaderContext} from '../interfaces';
import ADialog from './ADialog';
import {removeAllPopups} from './manager';

/** @internal */
export default class MoreColumnOptionsDialog extends ADialog {

  constructor(private readonly column: Column, attachment: HTMLElement, private readonly ctx: IRankingHeaderContext) {
    super(attachment, {
      hideOnMoveOutside: true
    });
  }

  open() {
    removeAllPopups(); // close all open once
    super.open();
  }

  protected build(node: HTMLElement) {
    node.classList.add('lu-more-options');
    createToolbarMenuItems(<any>addIconDOM(node, this.column, this.ctx, true), this.column, this.ctx);
  }
}
