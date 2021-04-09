import type { NumberColumn } from '../../model';
import type { IDialogContext } from './ADialog';
import { round, getNumberOfBins } from '../../internal';
import { forEach } from '../../renderer/utils';
import { cssClass } from '../../styles';
import type { IToolbarDialogAddonHandler } from '../interfaces';

/** @internal */
export default function groupNumber(
  col: NumberColumn,
  node: HTMLElement,
  dialog: IDialogContext
): IToolbarDialogAddonHandler {
  const domain = col.getMapping().domain;
  const before = col.getGroupThresholds();
  const isThreshold = before.length <= 1;
  const ranking = col.findMyRanker()!;
  node.insertAdjacentHTML(
    'beforeend',
    `
    <label class="${cssClass('checkbox')}">
      <input type="radio" name="threshold" value="threshold" ${isThreshold ? 'checked' : ''}>
      <span>at&nbsp;<input type="number" size="10" id="${dialog.idPrefix}N1" value="${
      before.length > 0 ? before[0] : round((domain[1] - domain[0]) / 2, 2)
    }"
          required min="${domain[0]}" max="${domain[1]}" step="any" ${!isThreshold ? 'disabled' : ''}>
      </span>
    </label>
    <label class="${cssClass('checkbox')}">
      <input type="radio" name="threshold" value="bins" ${!isThreshold ? 'checked' : ''}>
      <span> in&nbsp;<input type="number" size="5" id="${dialog.idPrefix}N2" value="${
      before.length > 1 ? before.length : getNumberOfBins(ranking.getOrderLength())
    }"
          required min="2" step="1" ${isThreshold ? 'disabled' : ''}>&nbsp;bins
      </span>
    </label>
  `
  );

  const threshold = node.querySelector<HTMLInputElement>(`#${dialog.idPrefix}N1`);
  const bins = node.querySelector<HTMLInputElement>(`#${dialog.idPrefix}N2`);

  forEach(node, 'input[name=threshold]', (d: HTMLInputElement) => {
    d.addEventListener(
      'change',
      () => {
        const isThreshold = d.value === 'threshold';
        threshold.disabled = !isThreshold;
        bins.disabled = isThreshold;
      },
      { passive: true }
    );
  });

  return {
    elems: `input[name=threshold], #${dialog.idPrefix}N1, #${dialog.idPrefix}N2`,
    submit() {
      const isThreshold = node.querySelector<HTMLInputElement>('input[name=threshold]:checked')!.value === 'threshold';
      if (isThreshold) {
        col.setGroupThresholds([threshold.valueAsNumber]);
        return true;
      }
      const count = Number.parseInt(bins.value, 10);
      const delta = (domain[1] - domain[0]) / count;
      let act = domain[0] + delta;
      const thresholds = [act];
      for (let i = 1; i < count - 1; ++i) {
        act += delta;
        thresholds.push(act);
      }
      col.setGroupThresholds(thresholds);
      return true;
    },
    cancel() {
      col.setGroupThresholds(before);
    },
    reset() {
      const value = round((domain[1] - domain[0]) / 2, 2);
      threshold.value = value.toString();
      threshold.disabled = false;
      bins.value = getNumberOfBins(ranking.getOrderLength()).toString();
      bins.disabled = true;
      node.querySelector<HTMLInputElement>('input[name=threshold][value=threshold]')!.checked = true;
    },
  };
}
