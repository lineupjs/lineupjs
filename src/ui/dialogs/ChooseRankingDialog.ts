import ADialog, {IDialogContext} from './ADialog';
import {cssClass} from '../../styles';

/** @internal */
export default class ChooseRankingDialog extends ADialog {

  constructor(private readonly items: HTMLElement[], dialog: IDialogContext) {
    super(dialog);
  }


  protected build(node: HTMLElement) {
    node.classList.add(cssClass('more-options'), cssClass('choose-options'));
    for (const item of this.items) {
      node.appendChild(item);
    }
  }
}
