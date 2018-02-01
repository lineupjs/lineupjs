import StackColumn from '../model/StackColumn';
import ADialog from './ADialog';


export default class WeightsEditDialog extends ADialog {
  /**
   * opens a dialog for editing the weights of a stack column
   * @param column the column to filter
   * @param header the visual header element of this column
   * @param title optional title
   */
  constructor(private readonly column: StackColumn, header: HTMLElement, title = 'Edit Weights') {
    super(header, title);
  }

  protected build():HTMLElement {
    const weights = this.column.getWeights();
    const children = this.column.children.map((d, i) => ({col: d, weight: Math.round(weights[i] * 100)} ));

    //map weights to pixels
    const scale = (v: number) => Math.round((v / 100) * 120);

    const popup = this.makePopup('<table></table>');

    //show as a table with inputs and bars
    const base = popup.querySelector('table')!;
    children.forEach((d) => {
      base.insertAdjacentHTML('beforeend', `<tr>
        <td><input type="number" value="${d.weight}" min="0" max="100" size="5"></td>
        <td width="100px"><div class="${d.col.cssClass} bar" style="background-color: ${d.col.color}"></div></td>
        <td>${d.col.label}</td>
       </tr>`);
      base.lastElementChild!.querySelector('input')!.addEventListener('input', function (this: HTMLInputElement) {
        d.weight = +this.value;
        redraw();
      });
    });

    function redraw() {
      Array.from(base.querySelectorAll('.bar')).forEach((n: HTMLElement, i) => n.style.width = `${scale(children[i].weight)}px`);
    }

    redraw();

    this.onButton(popup, {
      cancel: () => {
        this.column.setWeights(weights);
      },
      reset: () => {
        children.forEach((d, i) => d.weight = Math.round(weights[i] * 100));
        Array.from(base.querySelectorAll('input')).forEach((n: HTMLInputElement, i) => n.value = children[i].weight.toString());
        redraw();
      },
      submit: () => {
        this.column.setWeights(children.map((d) => d.weight));
        return true;
      }
    });

    return popup;
  }
}
