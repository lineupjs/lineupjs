import ADialog, { IDialogContext } from './ADialog';
import { cssClass } from '../../styles';
import type { IDataProvider } from '../../provider';

/** @internal */
export default class ShowTopNDialog extends ADialog {
  private readonly before: number;

  constructor(private readonly provider: IDataProvider, dialog: IDialogContext) {
    super(dialog);

    this.before = this.provider.getShowTopN();
  }

  protected build(node: HTMLElement) {
    node.classList.add(cssClass('dialog-rename'));
    node.insertAdjacentHTML(
      'beforeend',
      `
      <input type="number" min="0" step="1" value="${this.dialog.sanitize(String(this.before))}">`
    );

    this.enableLivePreviews('input');
  }

  protected cancel() {
    this.provider.setShowTopN(this.before);
  }

  protected submit() {
    const value = this.findInput('input').valueAsNumber;
    this.provider.setShowTopN(value);
    return true;
  }

  protected reset() {
    const defaultValue = 10;
    this.findInput('input').value = defaultValue.toString();
  }
}
