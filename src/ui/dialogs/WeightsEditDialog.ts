import {round} from '../../internal/math';
import StackColumn from '../../model/StackColumn';
import ADialog from './ADialog';


export default class WeightsEditDialog extends ADialog {

  private readonly weights: number[];

  constructor(private readonly column: StackColumn, attachment: HTMLElement) {
    super(attachment, {
      fullDialog: true
    });

    this.weights = this.column.getWeights();
  }

  protected reset() {
    Array.from(this.node.querySelectorAll('input[type=number]')).forEach((n: HTMLInputElement) => {
      const v = round(100 / this.weights.length, 2);
      n.value = String(v);
      (<HTMLElement>n.nextElementSibling!).style.width = `${v}%`;
    });
    this.column.setWeights(this.weights.slice().fill(100 / this.weights.length));
  }

  protected build(node: HTMLElement) {
    node.classList.add('lu-filter-table');

    const children = this.column.children;
    node.insertAdjacentHTML('beforeend', `<div>
        ${this.weights.map((weight, i) => `<div><input type="number" value="${round(weight * 100, 2)}" min="0" max="100" size="5"><span style="background-color: ${children[i].color}; width: ${round(weight * 100, 2)}%"></span>${children[i].label}</div>`).join('')}
    </div>`);
    this.forEach('input[type=number]', (d: HTMLInputElement) => {
      d.oninput = () => {
        (<HTMLElement>d.nextElementSibling).style.width = `${d.value}px`;
      };
    });
  }

  submit() {
    const items = this.forEach('input[type=number]', (n: HTMLInputElement) => parseFloat(n.value) / 100);
    this.column.setWeights(items);
    return true;
  }
}
