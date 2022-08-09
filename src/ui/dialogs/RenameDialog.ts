import type { Column, IColumnMetaData } from '../../model';
import ADialog, { IDialogContext } from './ADialog';
import { cssClass } from '../../styles';

/** @internal */
export default class RenameDialog extends ADialog {
  private readonly before: IColumnMetaData;

  constructor(private readonly column: Column, dialog: IDialogContext) {
    super(dialog);
    this.before = column.getMetaData();
  }

  protected build(node: HTMLElement) {
    node.classList.add(cssClass('dialog-rename'));
    node.insertAdjacentHTML(
      'beforeend',
      `
      <input type="text" required autofocus placeholder="name">
      <input type="text" placeholder="summary" name="summary">
      <textarea class="${cssClass('textarea')}" rows="5" placeholder="description"></textarea>`
    );
    node.querySelector<HTMLInputElement>('input').value = this.column.label;
    node.querySelector<HTMLInputElement>('input:last-of-type').value = this.column.getMetaData().summary;
    node.querySelector<HTMLTextAreaElement>('textarea').textContent = this.column.description;
  }

  protected reset() {
    const desc = this.column.desc;
    const meta = {
      label: desc.label || this.column.id,
      summary: desc.summary || '',
      description: desc.description || '',
    };
    this.findInput('input[type="text"]').value = meta.label;
    this.findInput('input[name="summary"]').value = meta.summary;
    this.node.querySelector('textarea')!.value = meta.description;
  }

  protected submit() {
    const label = this.findInput('input[type="text"]').value;
    const summary = this.findInput('input[name="summary"]').value.trim();
    const description = this.node.querySelector('textarea')!.value;
    this.column.setMetaData({ label, description, summary });
    return true;
  }

  protected cancel() {
    this.column.setMetaData(this.before);
  }
}
