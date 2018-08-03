import {IColumnMetaData} from '../../model';
import Column from '../../model/Column';
import ADialog, {IDialogContext} from './ADialog';
import {uniqueId} from '../../renderer/utils';
import {schemeCategory10} from 'd3-scale-chromatic';

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
    node.classList.add('lu-rename-dialog');
    const id = uniqueId('col');
    node.insertAdjacentHTML('beforeend', `
      <datalist id="${id}L"><option value="${Column.DEFAULT_COLOR}"></option>${schemeCategory10.slice(1).map((d) => `<option>${d}</option>`).join('')}</datalist>
      <input type="text" value="${this.column.label}" required autofocus placeholder="name">
      <input type="color" value="${this.column.color}" required placeholder="color" list="${id}L">
      <textarea rows="5" placeholder="Description">${this.column.description}</textarea>`);
  }

  protected reset() {
    this.findInput('input[type="text"]').value = this.before.label;
    this.findInput('input[type="color"]').value = this.before.color || Column.DEFAULT_COLOR;
    this.node.querySelector('textarea')!.value = this.before.description;
    this.column.setMetaData(this.before);
  }

  protected submit() {
    const newValue = this.findInput('input[type="text"]').value;
    const newColor = this.findInput('input[type="color"]').value;
    const newDescription = this.node.querySelector('textarea')!.value;
    this.column.setMetaData({label: newValue, color: newColor, description: newDescription});
    return true;
  }
}
