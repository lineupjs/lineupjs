import {filterMissingMarkup, findFilterMissing} from '../missing';
import ADialog, {IDialogContext} from './ADialog';
import {updateFilterState, uniqueId} from './utils';
import {DateColumn, IDateFilter} from '../../model';
import {isDummyDateFilter, noDateFilter} from '../../model/internalDate';
import {timeFormat} from 'd3-time-format';

/** @internal */
export default class DateFilterDialog extends ADialog {

  constructor(private readonly column: DateColumn, dialog: IDialogContext) {
    super(dialog);
  }

  private updateFilter(filter: IDateFilter | null) {
    updateFilterState(this.attachment, this.column, filter != null && !isDummyDateFilter(filter));
    this.column.setFilter(filter);
  }

  reset() {
    this.forEach('input[type=date]', (n: HTMLInputElement) => n.value = '');
    this.forEach('input[type=checkbox]', (n: HTMLInputElement) => n.checked = false);
    this.updateFilter(null);
  }

  submit() {
    const filterMissing = findFilterMissing(this.node).checked;
    const from: Date | null = this.findInput('input[name="from"]').valueAsDate;
    const to: Date | null = this.findInput('input[name="to"]').valueAsDate;
    this.updateFilter({filterMissing, min: from == null ? -Infinity : from.getTime(), max: to == null ? +Infinity : to.getTime()});
    return true;
  }

  protected build(node: HTMLElement) {
    const act = this.column.getFilter() || noDateFilter();
    const id = uniqueId(this.dialog.idPrefix);

    const f = timeFormat('%Y-%m-%d');

    node.insertAdjacentHTML('beforeend', `
    <label for="${id}F">From: </label>
    <input type="date" id="${id}F" name="from" placeholder="From..." autofocus value="${isFinite(act.min) ? f(new Date(act.min)) : ''}">
    <label for="${id}T">To: </label>
    <input type="date" id="${id}T" name="to" placeholder="To..." value="${isFinite(act.max) ? f(new Date(act.max)) : ''}">
    ${filterMissingMarkup(act.filterMissing)}`);

    const update = () => {
      this.submit();
    };

    this.forEach('input', (n: HTMLInputElement) => n.onchange = update);
  }
}
