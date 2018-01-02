import Column from '../../model/Column';
import {IRankingHeaderContext} from '../interfaces';
import ADialog from './ADialog';


export default class ChangeRendererDialog extends ADialog {
  constructor(private readonly column: Column, attachment: HTMLElement, private readonly ctx: IRankingHeaderContext) {
    super(attachment, {
      hideOnMoveOutside: true
    });
  }

  protected build(node: HTMLElement) {
    const current = this.column.getRenderer();
    const currentGroup = this.column.getGroupRenderer();
    const {item: possible, group: possibleGroup} = this.ctx.getPossibleRenderer(this.column);

    console.assert(possible.length > 1 || possibleGroup.length > 1); // otherwise no need to show this

    node.insertAdjacentHTML('beforeend', `
      ${possible.map((d) => `<label><input type="radio" name="renderer" value=${d.type}  ${(current === d.type) ? 'checked' : ''}> ${d.label}</label>`).join('')}
      <div>Group Visualization</div>
      ${possibleGroup.map((d) => `<label><input type="radio" name="group" value=${d.type}  ${(currentGroup === d.type) ? 'checked' : ''}> ${d.label}</label>`).join('')}
    `);
    Array.from(node.querySelectorAll('input[name="renderer"]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setRenderer(n.value));
    });
    Array.from(node.querySelectorAll('input[name="group"]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setGroupRenderer(n.value));
    });
  }

}
