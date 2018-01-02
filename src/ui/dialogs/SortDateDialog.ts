import DatesColumn from '../../model/DatesColumn';
import ADialog from './ADialog';
import {sortMethods, sortOrder} from './SortDialog';

export default class SortDateDialog extends ADialog {
   constructor(private readonly column: DatesColumn, attachment: HTMLElement) {
    super(attachment, {
      hideOnMoveOutside: true
    });
  }

  protected build(node: HTMLElement) {
    sortMethods(node, this.column, ['min', 'max', 'median']);
    sortOrder(node, this.column);
  }
}
