import ADialog, {IDialogContext} from './ADialog';
import {cssClass} from '../../styles';
import {IDataProvider} from '../../provider';

/** @internal */
export default class ShowTopNDialog extends ADialog {

  constructor(private readonly provider: IDataProvider, dialog: IDialogContext) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    node.classList.add(cssClass('dialog-rename'));
    node.insertAdjacentHTML('beforeend', `
      <input type="number" min="0" step="1" value="${this.provider.getShowTopN()}">`);

    this.findInput('input').onchange = (evt) => {
      const value = (<HTMLInputElement>evt.currentTarget).valueAsNumber;
      this.provider.setShowTopN(value);
    };
  }
}
