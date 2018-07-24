import Ranking from '../../model/Ranking';
import ADialog, {IDialogContext} from './ADialog';

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
    node.classList.add('lu-rename-dialog');
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
