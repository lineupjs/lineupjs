import StringColumn from '../../model/StringColumn';
import StringMapColumn from '../../model/StringMapColumn';
import StringsColumn from '../../model/StringsColumn';
import ADialog from './ADialog';

export default class EditPatternDialog extends ADialog {

  /**
   * opens a dialog for editing the link of a column
   * @param column the column to rename
   * @param header the visual header element of this column
   * @param idPrefix dom id prefix
   * @param title optional title
   */
  constructor(private readonly column: StringColumn|StringsColumn|StringMapColumn, header: HTMLElement, private readonly idPrefix: string, title = 'Edit Pattern ($ as Placeholder)') {
    super(header, title);
  }

  openDialog() {
    const templates = this.column.patternTemplates;
    let t = `<input
        type="text"
        size="15"
        value="${this.column.getPattern()}"
        required="required"
        autofocus="autofocus"
        placeholder="link pattern"
        ${templates.length > 0 ? `list="ui${this.idPrefix}lineupPatternList"` : ''}
      ><br>`;
    if (templates.length > 0) {
      t += `<datalist id="ui${this.idPrefix}lineupPatternList">${templates.map((t) => `<option value="${t}">`)}</datalist>`;
    }

    const popup = this.makePopup(t);

    this.onButton(popup, {
      cancel: () => undefined,
      reset: () => undefined,
      submit: () => {
        const newValue = popup.querySelector('input')!.value;
        this.column.setPattern(newValue);
        return true;
      }
    });
  }
}
