import {StringColumn, IStringFilter} from '../../model';
import {filterMissingMarkup, findFilterMissing} from '../missing';
import ADialog, {IDialogContext} from './ADialog';
import {updateFilterState} from './utils';
import {cssClass} from '../../styles';


/** @internal */
export default class StringFilterDialog extends ADialog {

  private readonly before: IStringFilter | null;

  constructor(private readonly column: StringColumn, dialog: IDialogContext) {
    super(dialog, {
      livePreview: 'filter'
    });

    this.before = this.column.getFilter();
  }

  private updateFilter(filter: string | RegExp | null, filterMissing: boolean) {
    updateFilterState(this.attachment, this.column, filterMissing || (filter != null && filter !== ''));
    this.column.setFilter({filter, filterMissing});
  }

  protected reset() {
    this.findInput('input[type="text"]').value = '';
    this.forEach('input[type=checkbox]', (n: HTMLInputElement) => n.checked = false);
  }

  protected cancel() {
    if (this.before) {
      this.updateFilter(this.before.filter, this.before.filterMissing);
    } else {
      this.updateFilter(null, false);
    }
  }

  protected submit() {
    const filterMissing = findFilterMissing(this.node).checked;
    const input = this.findInput('input[type="text"]').value;
    const isRegex = this.findInput('input[type="checkbox"]').checked;
    this.updateFilter(isRegex ? new RegExp(input, 'gm') : input, filterMissing);
    return true;
  }

  protected build(node: HTMLElement) {
    const bak = this.column.getFilter() || {filter: '', filterMissing: false};
    node.insertAdjacentHTML('beforeend', `<input type="text" placeholder="Filter ${this.column.desc.label}..." autofocus value="${(bak.filter instanceof RegExp) ? bak.filter.source : bak.filter || ''}" style="width: 100%">
    <label class="${cssClass('checkbox')}"><input type="checkbox" ${(bak.filter instanceof RegExp) ? 'checked="checked"' : ''}><span>Use regular expressions</span></label>
    ${filterMissingMarkup(bak.filterMissing)}`);

    const filterMissing = findFilterMissing(node);
    const input = <HTMLInputElement>node.querySelector('input[type="text"]');
    const isRegex = <HTMLInputElement>node.querySelector('input[type="checkbox"]');

    this.enableLivePreviews([filterMissing, input, isRegex]);
  }
}
