import LinkColumn from '../model/LinkColumn';
import Column from '../model/Column';
import ADialog from '../ui_dialogs';

export default class EditLinkDialog extends ADialog {

  private readonly templates;
  private readonly idPrefix;

  /**
   * opens a dialog for editing the link of a column
   * @param column the column to rename
   * @param $header the visual header element of this column
   * @param templates list of possible link templates
   * @param idPrefix dom id prefix
   * @param title optional title
   */
  constructor(column: LinkColumn, $header: d3.Selection<Column>, templates: string[] = [], idPrefix: string, title: string = 'Edit Link ($ as Placeholder)') {
    super(column, $header, title);

    this.templates = templates;
    this.idPrefix = idPrefix;

    this.openDialog();
  }

  openDialog() {
    let t = `<input 
        type="text"
        size="15"
        value="${(<LinkColumn>this.getColumn()).getLink()}"
        required="required"
        autofocus="autofocus"
        ${this.templates.length > 0 ? 'list="ui' + this.idPrefix + 'lineupPatternList"' : ''}
      ><br>`;
    if (this.templates.length > 0) {
      t += '<datalist id="ui${idPrefix}lineupPatternList">' + this.templates.map((t) => `<option value="${t}">`) + '</datalist>';
    }

    const popup = this.makePopup(t);

    const that = this;
    popup.select('.ok').on('click', function () {
      const newValue = popup.select('input[type="text"]').property('value');
      (<LinkColumn>that.getColumn()).setLink(newValue);
      popup.remove();
    });

    popup.select('.cancel').on('click', function () {
      popup.remove();
    });
  }
}
