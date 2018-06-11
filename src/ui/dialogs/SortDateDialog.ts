import DatesColumn from '../../model/DatesColumn';
import ADialog, { IDialogContext } from './ADialog';
import { sortMethods, sortOrder } from './SortDialog';

/** @internal */
export default class SortDateDialog extends ADialog {
  constructor(private readonly column: DatesColumn, dialog: IDialogContext) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    sortMethods(node, this.column, ['min', 'max', 'median'], this.dialog.idPrefix);
    sortOrder(node, this.column, this.dialog.idPrefix);
  }
}
