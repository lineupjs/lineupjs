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
    const currentSummary = this.column.getSummaryRenderer();
    const {item, group, summary} = this.ctx.getPossibleRenderer(this.column);

    console.assert(item.length > 1 || group.length > 1 || summary.length > 1); // otherwise no need to show this

    node.insertAdjacentHTML('beforeend', `
      ${item.map((d) => `<label><input type="radio" name="renderer" value=${d.type}  ${(current === d.type) ? 'checked' : ''}> ${d.label}</label>`).join('')}
      <h4>Group Visualization</h4>
      ${group.map((d) => `<label><input type="radio" name="group" value=${d.type}  ${(currentGroup === d.type) ? 'checked' : ''}> ${d.label}</label>`).join('')}
      <h4>Summary Visualization</h4>
      ${summary.map((d) => `<label><input type="radio" name="summary" value=${d.type}  ${(currentSummary === d.type) ? 'checked' : ''}> ${d.label}</label>`).join('')}
    `);
    Array.from(node.querySelectorAll('input[name="renderer"]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setRenderer(n.value));
    });
    Array.from(node.querySelectorAll('input[name="group"]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setGroupRenderer(n.value));
    });
    Array.from(node.querySelectorAll('input[name="summary"]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setSummaryRenderer(n.value));
    });
  }

}
