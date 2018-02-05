import Column from '../model/Column';
import ADialog from './ADialog';
import {IDataProvider} from '../provider/ADataProvider';

export default class SearchDialog extends ADialog {

  /**
   * opens a search dialog for the given column
   * @param column the column to rename
   * @param header the visual header element of this column
   * @param provider the data provider for the actual search
   * @param title optional title
   */
  constructor(private readonly column: Column, header: HTMLElement, private readonly provider: IDataProvider, title = 'Search') {
    super(header, title);
  }

  protected build():HTMLElement {
    const popup = this.makePopup('<input type="text" size="15" value="" required autofocus placeholder="search..."><br><label><input type="checkbox">RegExp</label><br>');

    const input = <HTMLInputElement>popup.querySelector('input[type="text"]')!;
    const checkbox = <HTMLInputElement>popup.querySelector('input[type="checkbox"]')!;
    input.addEventListener('input', () => {
      let search: any = input.value;
      if (search.length < 3) {
        return;
      }
      const isRegex = checkbox.checked;
      if (isRegex) {
        search = new RegExp(search);
      }
      this.provider.searchAndJump(search, this.column);
    });

    const updateImpl = () => {
      let search: string|RegExp = input.value;
      const isRegex = checkbox.checked;
      if (search.length === 0) {
        return;
      }
      if (isRegex) {
        search = new RegExp(search);
      }
      this.provider.searchAndJump(search, this.column);
    };

    checkbox.addEventListener('change', updateImpl);

    this.onButton(popup, {
      cancel: () => undefined,
      reset: () => undefined,
      submit: () => {
        updateImpl();
        return true;
      }
    });

    return popup;
  }
}
