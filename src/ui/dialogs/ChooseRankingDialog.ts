import type { IDialogContext } from './ADialog';
import { cssClass } from '../../styles';
import APopup from './APopup';

/** @internal */
export default class ChooseRankingDialog extends APopup {
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
