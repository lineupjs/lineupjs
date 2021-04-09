import type { DateColumn, IDateGranularity } from '../../model';
import { cssClass } from '../../styles';
import type { IToolbarDialogAddonHandler } from '../interfaces';
import { defaultDateGrouper } from '../../model/internalDate';

/** @internal */
export default function appendDate(col: DateColumn, node: HTMLElement): IToolbarDialogAddonHandler {
  const before = col.getDateGrouper();

  let html = '';
  for (const g of [
    'century',
    'decade',
    'year',
    'month',
    'week',
    'day_of_week',
    'day_of_month',
    'day_of_year',
    'hour',
    'minute',
    'second',
  ]) {
    html += `<label class="${cssClass('checkbox')}">
    <input type="radio" name="granularity" value="${g}" ${before.granularity === g ? 'checked' : ''}>
    <span> by ${g} </span>
  </label>`;
  }
  html += `<label class="${cssClass('checkbox')}">
    <input type="checkbox" name="circular" ${before.circular ? 'checked' : ''}>
    <span> Circular </span>
  </label>`;

  node.insertAdjacentHTML('beforeend', html);
  const circular = node.querySelector<HTMLInputElement>('input[name=circular]')!;

  return {
    elems: 'input[name=granularity],input[name=circular]',
    submit() {
      const granularity = node.querySelector<HTMLInputElement>('input[name=granularity]:checked')!
        .value as IDateGranularity;
      col.setDateGrouper({
        granularity,
        circular: circular.checked,
      });
      return true;
    },
    cancel() {
      col.setDateGrouper(before);
    },
    reset() {
      const r = defaultDateGrouper();
      circular.checked = r.circular;
      const g = node.querySelector<HTMLInputElement>(`input[name=granularity][value="${r.granularity}"]`)!;
      g.checked = true;
    },
  };
}
