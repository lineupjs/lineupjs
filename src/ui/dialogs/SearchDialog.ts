import Column from '../../model/Column';
import {IDataProvider} from '../../provider/ADataProvider';
import ADialog from './ADialog';

/** @internal */
export default class SearchDialog extends ADialog {

  constructor(private readonly column: Column, attachment: HTMLElement, private readonly provider: IDataProvider) {
    super(attachment, {
      hideOnMoveOutside: true
    });
  }

  protected build(node: HTMLElement) {
    node.insertAdjacentHTML('beforeend', `<input type="text" size="15" value="" required autofocus placeholder="search..."><label><input type="checkbox">RegExp</label>`);

    const input = <HTMLInputElement>node.querySelector('input[type="text"]')!;
    const checkbox = <HTMLInputElement>node.querySelector('input[type="checkbox"]')!;
    const update = () => {
      let search: any = input.value;
      if (search.length < 3) {
        return;
      }
      const isRegex = checkbox.checked;
      if (isRegex) {
        search = new RegExp(search);
      }
      this.provider.searchAndJump(search, this.column);
    };
    input.addEventListener('input', update);
    checkbox.addEventListener('change', update);
  }
}
