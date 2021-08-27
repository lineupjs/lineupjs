import type { IRankingHeaderContext } from '..';
import type { LinkColumn, LinkMapColumn, LinksColumn } from '../../model';
import ADialog, { IDialogContext } from './ADialog';

/** @internal */
export default class EditPatternDialog extends ADialog {
  private readonly before: string;

  constructor(
    private readonly column: LinkColumn | LinksColumn | LinkMapColumn,
    dialog: IDialogContext,
    private readonly ctx: IRankingHeaderContext
  ) {
    super(dialog);

    this.before = this.column.getPattern();
  }

  protected build(node: HTMLElement) {
    const templates = this.column.patternTemplates;
    const s = this.ctx.sanitize;
    node.insertAdjacentHTML(
      'beforeend',
      `<strong>Edit Pattern (access via $\{value}, $\{item})</strong><input
        type="text"
        size="30"
        value="${s(this.before)}"
        required
        autofocus
        placeholder="pattern (access via $\{value}, $\{item})"
        ${templates.length > 0 ? `list="ui${this.ctx.idPrefix}lineupPatternList"` : ''}
      >`
    );
    if (templates.length > 0) {
      node.insertAdjacentHTML(
        'beforeend',
        `<datalist id="ui${this.ctx.idPrefix}lineupPatternList">${templates.map(
          (t) => `<option value="${s(t)}">`
        )}</datalist>`
      );
    }

    this.enableLivePreviews('input');
  }

  protected cancel() {
    this.column.setPattern(this.before);
  }

  protected reset() {
    this.node.querySelector('input')!.value = '';
  }

  protected submit() {
    const newValue = this.node.querySelector('input')!.value;
    this.column.setPattern(newValue);
    return true;
  }
}
