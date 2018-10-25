import LinkColumn from '../../model/LinkColumn';
import LinkMapColumn from '../../model/LinkMapColumn';
import LinksColumn from '../../model/LinksColumn';
import ADialog, {IDialogContext} from './ADialog';

/** @internal */
export default class EditPatternDialog extends ADialog {

  constructor(private readonly column: LinkColumn | LinksColumn | LinkMapColumn, dialog: IDialogContext, private readonly idPrefix: string) {
    super(dialog, {
      fullDialog: true
    });
  }

  protected build(node: HTMLElement) {
    const templates = this.column.patternTemplates;
    node.insertAdjacentHTML('beforeend', `<strong>Edit Pattern (access via $\{value}, $\{item})</strong><input
        type="text"
        size="30"
        value="${this.column.getPattern()}"
        required
        autofocus
        placeholder="pattern (access via $\{value}, $\{item})"
        ${templates.length > 0 ? `list="ui${this.idPrefix}lineupPatternList"` : ''}
      >`);
    if (templates.length > 0) {
      node.insertAdjacentHTML('beforeend', `<datalist id="ui${this.idPrefix}lineupPatternList">${templates.map((t) => `<option value="${t}">`)}</datalist>`);
    }
  }

  protected reset() {
    this.node.querySelector('input')!.value = '';
    this.column.setPattern('');
  }

  protected submit() {
    const newValue = this.node.querySelector('input')!.value;
    this.column.setPattern(newValue);
    return true;
  }
}
