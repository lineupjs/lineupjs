import BooleanColumn from '../../model/BooleanColumn';
import ADialog, {IDialogContext} from './ADialog';
import {updateFilterState, uniqueId} from './utils';
import {cssClass} from '../../styles';

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
    const id = uniqueId(this.dialog.idPrefix);
    node.insertAdjacentHTML('beforeend', `
     <div class="${cssClass('checkbox')}"><input id="${id}0" type="radio" name="boolean_check" value="null" ${this.before == null ? 'checked="checked"' : ''}><label id="${id}0">No Filter</label></div>
     <div class="${cssClass('checkbox')}"><input id="${id}1" type="radio" name="boolean_check" value="true" ${this.before === true ? 'checked="checked"' : ''}><label id="${id}1">True</label></div>
     <div class="${cssClass('checkbox')}"><input id="${id}2" type="radio" name="boolean_check" value="false" ${this.before === false ? 'checked="checked"' : ''}><label id="${id}2">False</label></div>
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
