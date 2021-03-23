import { ScriptColumn } from '../../model';
import ADialog, { IDialogContext } from './ADialog';
import { cssClass } from '../../styles';

/** @internal */
export default class ScriptEditDialog extends ADialog {
  private readonly before: string;

  constructor(private readonly column: ScriptColumn, dialog: IDialogContext) {
    super(dialog);
    this.before = column.getScript();
  }

  protected build(node: HTMLElement) {
    node.insertAdjacentHTML(
      'beforeend',
      `<textarea class="${cssClass(
        'textarea'
      )}" autofocus="true" rows="5" autofocus="autofocus" style="width: 95%;">${this.column.getScript()}</textarea>`
    );
  }

  protected cancel() {
    this.column.setScript(this.before);
  }

  protected reset() {
    this.node.querySelector('textarea')!.value = (this.column.desc as any).script || ScriptColumn.DEFAULT_SCRIPT;
  }

  protected submit() {
    this.column.setScript(this.node.querySelector('textarea')!.value);
    return true;
  }
}
