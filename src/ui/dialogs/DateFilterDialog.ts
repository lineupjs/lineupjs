import {filterMissingMarkup, findFilterMissing} from '../missing';
import ADialog, {IDialogContext} from './ADialog';
import {updateFilterState, uniqueId} from './utils';
import {DateColumn, IDateFilter} from '../../model';
import {isDummyDateFilter, noDateFilter, shiftFilterDateDay} from '../../model/internalDate';
import {timeFormat} from 'd3-time-format';

/** @internal */
export default class DateFilterDialog extends ADialog {

  private readonly before: IDateFilter;

  constructor(private readonly column: DateColumn, dialog: IDialogContext) {
    super(dialog, {
      livePreview: dialog.manager.liveFilterPreviews
    });
    this.before = this.column.getFilter() || noDateFilter();
  }

  private updateFilter(filter: IDateFilter | null) {
    updateFilterState(this.attachment, this.column, filter != null && !isDummyDateFilter(filter));
    this.column.setFilter(filter);
  }

  protected reset() {
    this.forEach('input[type=date]', (n: HTMLInputElement) => n.value = '');
    this.forEach('input[type=checkbox]', (n: HTMLInputElement) => n.checked = false);
    this.updateFilter(null);
  }

  protected cancel() {
    this.updateFilter(this.before);
  }

  protected submit() {
    const filterMissing = findFilterMissing(this.node).checked;
    const from: Date | null = this.findInput('input[name="from"]').valueAsDate;
    const to: Date | null = this.findInput('input[name="to"]').valueAsDate;
    this.updateFilter({
      filterMissing,
      min: from == null ? -Infinity : shiftFilterDateDay(from.getTime(), 'min'),
      max: to == null ? +Infinity : shiftFilterDateDay(to.getTime(), 'max')
    });
    return true;
  }

  protected build(node: HTMLElement) {
    const act = this.before;
    const id = uniqueId(this.dialog.idPrefix);

    const f = timeFormat('%Y-%m-%d');

    node.insertAdjacentHTML('beforeend', `
    <label for="${id}F">From: </label>
    <input type="date" id="${id}F" name="from" placeholder="From..." autofocus value="${isFinite(act.min) ? f(new Date(act.min)) : ''}">
    <label for="${id}T">To: </label>
    <input type="date" id="${id}T" name="to" placeholder="To..." value="${isFinite(act.max) ? f(new Date(act.max)) : ''}">
    ${filterMissingMarkup(act.filterMissing)}`);

    this.enableLivePreviews('input');
  }
}
