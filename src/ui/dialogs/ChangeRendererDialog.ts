import Column from '../../model/Column';
import {IRankingHeaderContext} from '../interfaces';
import ADialog from './ADialog';


export default class ChangeRendererDialog extends ADialog {
  constructor(private readonly column: Column, header: HTMLElement, private readonly ctx: IRankingHeaderContext) {
    super(header, 'Visualization');
  }

  openDialog() {
    const current = this.column.getRenderer();

    const currentGroup = this.column.getGroupRenderer();
    const {item: possible, group: possibleGroup} = this.ctx.getPossibleRenderer(this.column);

    console.assert(possible.length > 1 || possibleGroup.length > 1); // otherwise no need to show this

    let html = '';

    html += possible.map((d) => {
      return `<label><input type="radio" name="renderertype" value=${d.type}  ${(current === d.type) ? 'checked' : ''}> ${d.label}</label><br>`;
    }).join('\n');

    if (currentGroup.length > 1) {
      html += '<strong>Group Visualization</strong><br>';
      html += possibleGroup.map((d) => {
        return `<label><input type="radio" name="grouptype" value=${d.type}  ${(currentGroup === d.type) ? 'checked' : ''}> ${d.label}</label><br>`;
      }).join('\n');
    }

    const popup = this.makeChoosePopup(html);

    Array.from(popup.querySelectorAll('input[name="renderertype"]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setRenderer(n.value));
    });
    Array.from(popup.querySelectorAll('input[name="grouptype"]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setGroupRenderer(n.value));
    });
  }
}
