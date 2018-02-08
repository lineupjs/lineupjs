import GroupColumn from '../../model/GroupColumn';
import ADialog, {IDialogContext} from './ADialog';
import {sortMethods, sortOrder} from './SortDialog';

/** @internal */
export default class SortDialog extends ADialog {
  constructor(private readonly column: GroupColumn, dialog: IDialogContext) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    sortMethods(node, this.column, ['name', 'count']);
    sortOrder(node, this.column, true);
  }
}
