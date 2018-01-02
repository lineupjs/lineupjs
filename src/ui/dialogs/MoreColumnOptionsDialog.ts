import Column from '../../model/Column';
import {addIconDOM, createToolbarMenuItems} from '../header';
import {IRankingHeaderContext} from '../interfaces';
import ADialog from './ADialog';


export default class MoreColumnOptionsDialog extends ADialog {

  constructor(private readonly column: Column, attachment: HTMLElement, private readonly ctx: IRankingHeaderContext) {
    super(attachment, {
      hideOnMoveOutside: true
    });
  }

  protected build(node: HTMLElement) {
    createToolbarMenuItems(<any>addIconDOM(node, this.column, this.ctx, true), this.column, this.ctx);
  }
}
