import {Ranking} from '../../model';
import ADialog, {IDialogContext} from './ADialog';
import {cssClass} from '../../styles';

/** @internal */
export default class RenameRankingDialog extends ADialog {

  private readonly before: string;

  constructor(private readonly ranking: Ranking, dialog: IDialogContext) {
    super(dialog, {
      fullDialog: true
    });
    this.before = ranking.getLabel();
  }

  protected build(node: HTMLElement) {
    node.classList.add(cssClass('dialog-rename'));
    node.insertAdjacentHTML('beforeend', `
      <input type="text" value="${this.ranking.getLabel()}" required autofocus placeholder="name">`);
  }

  protected reset() {
    this.findInput('input[type="text"]').value = this.before;
    this.ranking.setLabel(this.before);
  }

  protected submit() {
    const newValue = this.findInput('input[type="text"]').value;
    this.ranking.setLabel(newValue);
    return true;
  }
}
