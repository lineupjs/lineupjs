import Column from '../../model/Column';
import { IDataProvider } from '../../provider/ADataProvider';
import ADialog, { IDialogContext } from './ADialog';
import { randomId } from './utils';

/** @internal */
export default class SearchDialog extends ADialog {

  constructor(private readonly column: Column, dialog: IDialogContext, private readonly provider: IDataProvider) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    const id = randomId(this.dialog.idPrefix);
    node.insertAdjacentHTML('beforeend', `<input type="text" size="20" value="" required autofocus placeholder="search... (>= 3 chars)"><div class="lu-checkbox"><input id="${id}" type="checkbox"><label for="${id}">RegExp</label></div>`);

    const input = <HTMLInputElement>node.querySelector('input[type="text"]')!;
    const checkbox = <HTMLInputElement>node.querySelector('input[type="checkbox"]')!;
    const update = () => {
      let search: any = input.value;
      if (search.length < 3) {
        input.setCustomValidity('at least 3 characters');
        return;
      }
      input.setCustomValidity('');
      const isRegex = checkbox.checked;
      if (isRegex) {
        search = new RegExp(search);
      }
      this.provider.searchAndJump(search, this.column);
    };
    input.addEventListener('input', update, {
      passive: true
    });
    checkbox.addEventListener('change', update, {
      passive: true
    });
  }
}
