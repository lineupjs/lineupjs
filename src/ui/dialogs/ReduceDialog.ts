import {EAdvancedSortMethod} from '../../model/INumberColumn';
import ReduceColumn from '../../model/ReduceColumn';
import ADialog, {IDialogContext} from './ADialog';
import {sortMethods} from './utils';

/** @internal */
export default class ReduceDialog extends ADialog {
  constructor(private readonly column: ReduceColumn, dialog: IDialogContext) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    const wrapper = {
      getSortMethod: () => this.column.getReduce(),
      setSortMethod: (s: EAdvancedSortMethod) => this.column.setReduce(s)
    };
    sortMethods(node, wrapper, Object.keys(EAdvancedSortMethod), this.dialog.idPrefix);
  }
}
