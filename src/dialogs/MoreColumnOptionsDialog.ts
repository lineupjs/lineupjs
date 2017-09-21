import Column from '../model/Column';
import ADialog from './ADialog';


export default class ColumnOptionsDialog extends ADialog {

  /**
   * opens a rename dialog for the given column
   * @param column the column to rename
   * @param header the visual header element of this column
   * @param title optional title
   */
  constructor(private readonly column: Column, header: HTMLElement, title = 'More', col, ctx) {
    super(header, title);
  }

  openDialog() {
    this.makeMenuPopup(`${this.column.label}`);
  }
}
