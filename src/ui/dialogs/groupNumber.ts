import NumberColumn from '../../model/NumberColumn';
import {IDialogContext} from './ADialog';
import {round, getNumberOfBins} from '../../internal/math';
import {forEach} from '../../renderer/utils';


/** @internal */
export default function append(col: NumberColumn, node: HTMLElement, dialog: IDialogContext) {
  const domain = col.getMapping().domain;
  const current = col.getGroupThresholds();
  let isThreshold = current.length <= 1;
  const ranking =  col.findMyRanker()!;
  node.insertAdjacentHTML('beforeend', `
    <div class="lu-checkbox">
      <input type="radio" name="threshold" value="threshold" id="${dialog.idPrefix}T1" ${isThreshold ? 'checked' : ''}>
      <label for="${dialog.idPrefix}T1">at&nbsp;<input type="number" size="10" id="${dialog.idPrefix}N1" value="${current.length > 0 ? current[0] : round((domain[1] - domain[0]) / 2, 2)}"
          required min="${domain[0]}" max="${domain[1]}" step="any" ${!isThreshold ? 'disabled': ''}>
      </label>
    </div>
    <div class="lu-checkbox">
      <input type="radio" name="threshold" value="bins" id="${dialog.idPrefix}T2" ${!isThreshold ? 'checked' : ''}>
      <label for="${dialog.idPrefix}T2"> in&nbsp;<input type="number" size="5" id="${dialog.idPrefix}N2" value="${current.length > 1 ? current.length : getNumberOfBins(ranking.getOrder().length)}"
          required min="2" step="1" ${isThreshold ? 'disabled': ''}>&nbsp;bins
      </label>
    </div>
  `);

  const threshold = <HTMLInputElement>node.querySelector(`#${dialog.idPrefix}N1`);
  const bins = <HTMLInputElement>node.querySelector(`#${dialog.idPrefix}N2`);

  const update = () => {
    threshold.disabled = !isThreshold;
    bins.disabled = isThreshold;

    if (isThreshold) {
      col.setGroupThresholds([parseFloat(threshold.value)]);
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
