import {NumberColumn} from '../../model';
import {IDialogContext} from './ADialog';
import {round, getNumberOfBins} from '../../internal';
import {forEach} from '../../renderer/utils';
import {cssClass} from '../../styles';


/** @internal */
export default function append(col: NumberColumn, node: HTMLElement, dialog: IDialogContext) {
  const domain = col.getMapping().domain;
  const current = col.getGroupThresholds();
  let isThreshold = current.length <= 1;
  const ranking =  col.findMyRanker()!;
  node.insertAdjacentHTML('beforeend', `
    <label class="${cssClass('checkbox')}">
      <input type="radio" name="threshold" value="threshold" ${isThreshold ? 'checked' : ''}>
      <span>at&nbsp;<input type="number" size="10" id="${dialog.idPrefix}N1" value="${current.length > 0 ? current[0] : round((domain[1] - domain[0]) / 2, 2)}"
          required min="${domain[0]}" max="${domain[1]}" step="any" ${!isThreshold ? 'disabled': ''}>
      </span>
    </label>
    <label class="${cssClass('checkbox')}">
      <input type="radio" name="threshold" value="bins" ${!isThreshold ? 'checked' : ''}>
      <span> in&nbsp;<input type="number" size="5" id="${dialog.idPrefix}N2" value="${current.length > 1 ? current.length : getNumberOfBins(ranking.getOrderLength())}"
          required min="2" step="1" ${isThreshold ? 'disabled': ''}>&nbsp;bins
      </span>
    </label>
  `);

  const threshold = <HTMLInputElement>node.querySelector(`#${dialog.idPrefix}N1`);
  const bins = <HTMLInputElement>node.querySelector(`#${dialog.idPrefix}N2`);

  const update = () => {
    threshold.disabled = !isThreshold;
    bins.disabled = isThreshold;

    if (isThreshold) {
      col.setGroupThresholds([threshold.valueAsNumber]);
      return;
    }

    const count = parseInt(bins.value, 10);
    const delta = (domain[1] - domain[0]) / count;
    let act = domain[0] + delta;
    const thresholds = [act];
    for(let i = 1; i < count - 1; ++i) {
      act += delta;
      thresholds.push(act);
    }
    col.setGroupThresholds(thresholds);
  };

  threshold.addEventListener('change', update, { passive: true });
  bins.addEventListener('change', update, { passive: true });


  forEach(node, 'input[name=threshold]', (d: HTMLInputElement) => {
    d.addEventListener('change', () => {
      isThreshold = d.value === 'threshold';
      update();
    }, { passive: true });
  });
}
