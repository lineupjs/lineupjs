import StringColumn from '../../model/StringColumn';
import StringMapColumn from '../../model/StringMapColumn';
import StringsColumn from '../../model/StringsColumn';
import ADialog from './ADialog';

export default class EditPatternDialog extends ADialog {

  private readonly before: string;

  constructor(private readonly column: StringColumn | StringsColumn | StringMapColumn, attachment: HTMLElement, private readonly idPrefix: string) {
    super(attachment, {
      fullDialog: true
    });
    this.before = column.getPattern();
  }

  protected build(node: HTMLElement) {
    const templates = this.column.patternTemplates;
    node.insertAdjacentHTML('beforeend', `<input
        type="text"
        size="15"
        value="${this.before}"
        required
        autofocus
        placeholder="pattern ($1 as placeholder)"
        ${templates.length > 0 ? `list="ui${this.idPrefix}lineupPatternList"` : ''}
      >`);
    if (templates.length > 0) {
      node.insertAdjacentHTML('beforeend', `<datalist id="ui${this.idPrefix}lineupPatternList">${templates.map((t) => `<option value="${t}">`)}</datalist>`);
    }
  }

  protected reset() {
    this.node.querySelector('input')!.value = this.before;
    this.column.setPattern(this.before);
  }

  protected submit() {
    const newValue = this.node.querySelector('input')!.value;
    this.column.setPattern(newValue);
    return true;
  }
}
