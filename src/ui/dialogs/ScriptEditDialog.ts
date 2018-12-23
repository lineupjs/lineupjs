import {ScriptColumn} from '../../model';
import ADialog, {IDialogContext} from './ADialog';
import {cssClass} from '../../styles';

/** @internal */
export default class ScriptEditDialog extends ADialog {
  private readonly before: string;

  constructor(private readonly column: ScriptColumn, dialog: IDialogContext) {
    super(dialog, {
      fullDialog: true
    });
    this.before = column.getScript();
  }

  protected build(node: HTMLElement) {
    node.insertAdjacentHTML('beforeend', `<textarea class="${cssClass('textarea')}" autofocus="true" rows="5" autofocus="autofocus" style="width: 95%;">${this.column.getScript()}</textarea>`);
  }

  protected reset() {
    this.node.querySelector('textarea')!.value = this.before;
    this.column.setScript(this.before);
  }

  protected submit() {
    this.column.setScript(this.node.querySelector('textarea')!.value);
    return true;
  }
}
