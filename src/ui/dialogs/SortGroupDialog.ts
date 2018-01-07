import GroupColumn from '../../model/GroupColumn';
import ADialog from './ADialog';
import {sortMethods, sortOrder} from './SortDialog';

/** @internal */
export default class SortDialog extends ADialog {
  constructor(private readonly column: GroupColumn, attachment: HTMLElement) {
    super(attachment, {
      hideOnMoveOutside: true
    });
  }

  protected build(node: HTMLElement) {
    sortMethods(node, this.column, ['name', 'count']);
    sortOrder(node, this.column, true);
  }
}
