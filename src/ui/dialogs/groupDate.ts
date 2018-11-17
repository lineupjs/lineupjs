import {IDialogContext} from './ADialog';
import {forEach} from '../../renderer/utils';
import DateColumn from '../../model/DateColumn';
import {IDateGranularity} from '../../model';
import {cssClass} from '../../styles';


/** @internal */
export default function appendDate(col: DateColumn, node: HTMLElement, dialog: IDialogContext) {
  const current = col.getDateGrouper();

  let granularity = current.granularity;
  let circular = current.circular;

  let html: string = '';
  for (const g of ['century', 'decade', 'year', 'month', 'week', 'day_of_week', 'day_of_month', 'day_of_year', 'hour', 'minute', 'second']) {
    html += `<div class="${cssClass('checkbox')}">
    <input type="radio" name="granularity" value="${g}" id="${dialog.idPrefix}D${g}" ${granularity === g ? 'checked' : ''}>
    <label for="${dialog.idPrefix}D${g}"> by ${g}
    </label>
  </div>`;
  }
  html += `<div class="${cssClass('checkbox')}">
    <input type="checkbox" name="circular" id="${dialog.idPrefix}DC" ${circular ? 'checked' : ''}>
    <label for="${dialog.idPrefix}DC"> Circular
    </label>
  </div>`;

  node.insertAdjacentHTML('beforeend', html);

  const update = () => {
    col.setDateGrouper({granularity, circular});
  };


  node.querySelector<HTMLInputElement>(`#${dialog.idPrefix}DC`)!.addEventListener('change', (evt) => {
    circular = (<HTMLInputElement>evt.currentTarget).checked;
    update();
  }, { passive: true });

  forEach(node, 'input[name=granularity]', (d: HTMLInputElement) => {
    d.addEventListener('change', () => {
      granularity = <IDateGranularity>d.value;
      update();
    }, { passive: true });
  });
}
