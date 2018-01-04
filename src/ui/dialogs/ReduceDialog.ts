import {EAdvancedSortMethod} from '../../model/INumberColumn';
import ReduceColumn from '../../model/ReduceColumn';
import ADialog from './ADialog';
import {sortMethods} from './SortDialog';

export default class ReduceDialog extends ADialog {
  constructor(private readonly column: ReduceColumn, attachment: HTMLElement) {
    super(attachment, {
      hideOnMoveOutside: true
    });
  }

  protected build(node: HTMLElement) {
    const wrapper = {
      getSortMethod: () => this.column.getReduce(),
      setSortMethod: (s: EAdvancedSortMethod) => this.column.setReduce(s)
    };
    sortMethods(node,wrapper, EAdvancedSortMethod);
  }
}
