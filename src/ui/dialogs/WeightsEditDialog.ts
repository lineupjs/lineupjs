import {round} from '../../internal';
import StackColumn from '../../model/StackColumn';
import ADialog, {IDialogContext} from './ADialog';
import {forEach, colorOf} from './utils';
import {cssClass} from '../../styles';

/** @internal */
export default class WeightsEditDialog extends ADialog {

  private readonly weights: number[];

  constructor(private readonly column: StackColumn, dialog: IDialogContext) {
    super(dialog, {
      fullDialog: true
    });

    this.weights = this.column.getWeights();
  }

  protected reset() {
    const weight = 100 / this.weights.length;
    forEach(this.node, 'input[type=number]', (n: HTMLInputElement) => {
      const v = round(weight, 2);
      n.value = String(v);
      (<HTMLElement>n.nextElementSibling!.firstElementChild!).style.width = `${v}%`;
    });
    this.column.setWeights(this.weights.slice().fill(weight));
  }

  protected build(node: HTMLElement) {

    const children = this.column.children;
    node.insertAdjacentHTML('beforeend', `<div class="${cssClass('dialog-table')}">
        ${this.weights.map((weight, i) => `<div class="${cssClass('dialog-weights-table-entry')}">
          <input type="number" value="${round(weight * 100, 2)}" min="0" max="100" step="any" required>
          <span class="${cssClass('dialog-filter-color-bar')}">
            <span style="background-color: ${colorOf(children[i])}; width: ${round(weight * 100, 2)}%"></span>
          </span>
          ${children[i].label}
        </div>`).join('')}
    </div>`);
    const inputs = Array.from(this.node.querySelectorAll<HTMLInputElement>('input[type=number]'));
    inputs.forEach((d, i) => {
      d.oninput = () => {
        const weight = parseFloat(d.value);
        if (weight <= 0) {
          d.setCustomValidity('weight cannot be zero');
        } else {
          d.setCustomValidity('');
        }
        const bar = (<HTMLElement>d.nextElementSibling!.firstElementChild!);
        bar.style.width = `${d.value}%`;

        if (inputs.length !== 2) {
          return;
        }

        // corner case auto decrease the other
        const rest = 100 - weight;

        if (rest <= 0) {
          d.setCustomValidity('weight cannot be 100 in case of two elements');
        } else {
          d.setCustomValidity('');
        }

        const other = inputs[1 - i]!;
        other.value = round(rest, 2).toString();
        (<HTMLElement>other.nextElementSibling!.firstElementChild!).style.width = `${other.value}%`;
      };
    });
  }

  submit() {
    const inputs = Array.from(this.node.querySelectorAll<HTMLInputElement>('input[type=number]'));
    const weights = inputs.map((n: HTMLInputElement) => parseFloat(n.value));
    let invalid = false;
    for (let i = 0; i < inputs.length; ++i) {
      const weight = weights[i];
      if (weight <= 0) {
        inputs[i].setCustomValidity('weight cannot be zero');
        invalid = true;
      } else {
        inputs[i].setCustomValidity('');
      }
    }
    if (invalid) {
      if (typeof (<any>this.node).reportValidity === 'function') {
        (<any>this.node).reportValidity();
      }
      return false;
    }

    this.column.setWeights(weights.map((d) => d / 100));
    return true;
  }
}
