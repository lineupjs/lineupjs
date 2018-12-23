import {Column} from '../../model';
import {IRankingHeaderContext, IRenderInfo} from '../interfaces';
import ADialog, {IDialogContext} from './ADialog';
import {cssClass} from '../../styles';

/** @internal */
export default class ChangeRendererDialog extends ADialog {
  constructor(private readonly column: Column, dialog: IDialogContext, private readonly ctx: IRankingHeaderContext) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    const current = this.column.getRenderer();
    const currentGroup = this.column.getGroupRenderer();
    const currentSummary = this.column.getSummaryRenderer();
    const {item, group, summary} = this.ctx.getPossibleRenderer(this.column);

    console.assert(item.length > 1 || group.length > 1 || summary.length > 1); // otherwise no need to show this

    const byName = (a: IRenderInfo, b: IRenderInfo) => a.label.localeCompare(b.label);
    node.insertAdjacentHTML('beforeend', `
      <strong>Item Visualization</strong>
      ${item.sort(byName).map((d) => ` <label class="${cssClass('checkbox')}"><input type="radio" name="renderer" value="${d.type}" ${(current === d.type) ? 'checked' : ''}><span>${d.label}</span></label>`).join('')}
      <strong>Group Visualization</strong>
      ${group.sort(byName).map((d) => ` <label class="${cssClass('checkbox')}"><input type="radio" name="group" value="${d.type}" ${(currentGroup === d.type) ? 'checked' : ''}><span>${d.label}</span></label>`).join('')}
      <strong>Summary Visualization</strong>
      ${summary.sort(byName).map((d) => ` <label class="${cssClass('checkbox')}"><input type="radio" name="summary" value="${d.type}" ${(currentSummary === d.type) ? 'checked' : ''}><span>${d.label}</span></label>`).join('')}
    `);
    this.forEach('input[name="renderer"]', (n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setRenderer(n.value), { passive: true });
    });
    this.forEach('input[name="group"]', (n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setGroupRenderer(n.value), { passive: true });
    });
    this.forEach('input[name="summary"]', (n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setSummaryRenderer(n.value), { passive: true });
    });
  }

}
