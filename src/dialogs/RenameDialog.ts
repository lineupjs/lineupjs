import Column from '../model/Column';
import ADialog from './ADialog';


export default class RenameDialog extends ADialog {

  /**
   * opens a rename dialog for the given column
   * @param column the column to rename
   * @param header the visual header element of this column
   * @param title optional title
   */
  constructor(private readonly column: Column, header: HTMLElement, title = 'Rename Column') {
    super(header, title);
  }

  protected build():HTMLElement {
    const popup = this.makePopup(`
      <input type="text" value="${this.column.label}" required autofocus placeholder="name">
      <input type="color" value="${this.column.color}" required placeholder="color">
      <textarea rows="5">${this.column.description}</textarea><br>`
    );
    popup.classList.add('lu-rename-dialog');

    this.onButton(popup, {
      cancel: () => undefined,
      reset: () => undefined,
      submit: () => {
        const newValue = (<HTMLInputElement>popup.querySelector('input[type="text"]')!).value;
        const newColor = (<HTMLInputElement>popup.querySelector('input[type="color"]')!).value;
        const newDescription = popup.querySelector('textarea')!.value;
        this.column.setMetaData({label: newValue, color: newColor, description: newDescription});
        return true;
      }
    });

    return popup;
  }
}
