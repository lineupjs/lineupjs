import Column from '../model/Column';
import ADialog from './ADialog';


export default class RenameDialog extends ADialog {

  /**
   * opens a rename dialog for the given column
   * @param column the column to rename
   * @param $header the visual header element of this column
   * @param title optional title
   */
  constructor(private readonly column: Column, $header: d3.Selection<Column>, title: string = 'Rename Column') {
    super($header, title);
  }

  openDialog() {
    const popup = this.makePopup(`
      <input type="text" size="15" value="${this.column.label}" required="required" autofocus="autofocus"><br>
      <input type="color" size="15" value="${this.column.color}" required="required"><br>
      <textarea rows="5">${this.column.description}</textarea><br>`
    );

    popup.select('.ok').on('click', () => {
      const newValue = popup.select('input[type="text"]').property('value');
      const newColor = popup.select('input[type="color"]').property('value');
      const newDescription = popup.select('textarea').property('value');
      this.column.setMetaData({label: newValue, color: newColor, description: newDescription});
      popup.remove();
    });

    popup.select('.cancel').on('click', function () {
      popup.remove();
    });
  }
}
