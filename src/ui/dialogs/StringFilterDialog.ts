import StringColumn from '../../model/StringColumn';
import {filterMissingMarkup} from '../missing';
import ADialog from './ADialog';


export default class StringFilterDialog extends ADialog {

  constructor(private readonly column: StringColumn, attachment: HTMLElement) {
    super(attachment, {
      fullDialog: true
    });
  }

  private updateFilter(filter: string | RegExp | null) {
    this.attachment.classList.toggle('lu-filtered', filter != null && filter !== '');
    this.column.setFilter(filter);
  }

  reset() {
    this.findInput('input[type="text"]').value = '';
    this.forEach('input[type=checkbox', (n: HTMLInputElement) => n.checked = false);
    this.updateFilter(null);
  }

  submit() {
    const filterMissing = this.findInput('input[type="checkbox"].lu_filter_missing').checked;
    if (filterMissing) {
      this.updateFilter(StringColumn.FILTER_MISSING);
      return true;
    }
    const input = this.findInput('input[type="text"]').value;
    const isRegex = this.findInput('input[type="checkbox"]:first-of-type').checked;
    this.updateFilter(isRegex ? new RegExp(input) : input);
    return true;
  }

  protected build(node: HTMLElement) {
    let bak = this.column.getFilter() || '';
    const bakMissing = bak === StringColumn.FILTER_MISSING;
    if (bakMissing) {
      bak = '';
    }
    node.insertAdjacentHTML('beforeend', `<input type="text" placeholder="containing..." autofocus value="${(bak instanceof RegExp) ? bak.source : bak}" style="width: 100%">
    <label><input type="checkbox" ${(bak instanceof RegExp) ? 'checked="checked"' : ''}>RegExp</label>
    ${filterMissingMarkup(bakMissing)}`);
  }
}
