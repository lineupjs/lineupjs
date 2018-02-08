import BooleanColumn from '../../model/BooleanColumn';
import ADialog, {IDialogContext} from './ADialog';
import { updateFilterState } from './utils';

/** @internal */
export default class BooleanFilterDialog extends ADialog {

  private readonly before: boolean | null;

  constructor(private readonly column: BooleanColumn, dialog: IDialogContext) {
    super(dialog, {
      fullDialog: true
    });
    this.before = this.column.getFilter();
  }

  protected build(node: HTMLElement) {
    node.insertAdjacentHTML('beforeend', `
     <label><input type="radio" name="boolean_check" value="null" ${this.before == null ? 'checked="checked"' : ''}>No Filter</label>
     <label><input type="radio" name="boolean_check" value="true" ${this.before === true ? 'checked="checked"' : ''}>True</label>
     <label><input type="radio" name="boolean_check" value="false" ${this.before === false ? 'checked="checked"' : ''}>False</label>
    `);
  }

  private updateFilter(filter: boolean | null) {
    updateFilterState(this.attachment, this.column, filter != null);
    this.column.setFilter(filter);
  }

  reset() {
    const v = 'null';
    this.forEach('input[type="radio"]', (d: HTMLInputElement) => d.checked = d.value === v);
    this.updateFilter(null);
  }

  submit() {
    const isTrue = this.findInput('input[type="radio"][value="true"]').checked;
    const isFalse = this.findInput('input[type="radio"][value="false"]').checked;
    this.updateFilter(isTrue ? true : (isFalse ? false : null));
    return true;
  }
}
