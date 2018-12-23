import {Column} from '../../model';
import {IDataProvider} from '../../provider';
import ADialog, { IDialogContext} from './ADialog';
import {cssClass} from '../../styles';

/** @internal */
export default class SearchDialog extends ADialog {

  constructor(private readonly column: Column, dialog: IDialogContext, private readonly provider: IDataProvider) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    node.insertAdjacentHTML('beforeend', `<input type="text" size="20" value="" required autofocus placeholder="search... (>= 3 chars)"><label class="${cssClass('checkbox')}"><input type="checkbox"><span>RegExp</span></label>`);

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
