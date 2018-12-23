import {Column, IColumnMetaData} from '../../model';
import ADialog, {IDialogContext} from './ADialog';
import {cssClass} from '../../styles';

/** @internal */
export default class RenameDialog extends ADialog {

  private readonly before: IColumnMetaData;

  constructor(private readonly column: Column, dialog: IDialogContext) {
    super(dialog, {
      fullDialog: true
    });
    this.before = column.getMetaData();
  }

  protected build(node: HTMLElement) {
    node.classList.add(cssClass('dialog-rename'));
    node.insertAdjacentHTML('beforeend', `
      <input type="text" value="${this.column.label}" required autofocus placeholder="name">
      <textarea class="${cssClass('textarea')}" rows="5" placeholder="description">${this.column.description}</textarea>`);
  }

  protected reset() {
    this.findInput('input[type="text"]').value = this.before.label;
    this.node.querySelector('textarea')!.value = this.before.description;
    this.column.setMetaData(this.before);
  }

  protected submit() {
    const newValue = this.findInput('input[type="text"]').value;
    const newDescription = this.node.querySelector('textarea')!.value;
    this.column.setMetaData({label: newValue, description: newDescription});
    return true;
  }
}
