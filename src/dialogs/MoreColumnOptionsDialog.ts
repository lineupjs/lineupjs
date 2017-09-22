import Column from '../model/Column';
import ADialog from './ADialog';
import {createToolbarImpl2} from '../ui/engine/header';
import {IRankingHeaderContext} from '../ui/engine/interfaces';


export default class ColumnOptionsDialog extends ADialog {

  /**
   * opens a rename dialog for the given column
   * @param column the column to rename
   * @param header the visual header element of this column
   * @param title optional title
   */
  constructor(readonly column: Column, header: HTMLElement, title = 'More', private col: Column,  private ctx: IRankingHeaderContext) {
    super(header, title);
  }

  openDialog() {
    const popup = this.makeMenuPopup('');
    popup.classList.add('lu-more-options');

    const addIcon = (title: string, dialogClass?: { new(col: any, header: HTMLElement, ...args: any[]): ADialog }, ...dialogArgs: any[]) => {
      popup.insertAdjacentHTML('beforeend', `<i title="${title}"><span>${title}</span> </i>`);
      const i = <HTMLElement>popup.lastElementChild;
      if (!dialogClass) {
        return i;
      }
      i.onclick = (evt) => {
        evt.stopPropagation();
        const dialog = new dialogClass(this.col, i, ...dialogArgs);
        dialog.openDialog();
      };
      return i;
    };

    createToolbarImpl2(<any>addIcon, this.col, this.ctx);
  }
}
