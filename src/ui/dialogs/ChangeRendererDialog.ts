import Column from '../../model/Column';
import {IRankingHeaderContext, IRenderInfo} from '../interfaces';
import ADialog, {IDialogContext} from './ADialog';
import {uniqueId} from './utils';
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

    const id = uniqueId(this.dialog.idPrefix);
    const byName = (a: IRenderInfo, b: IRenderInfo) => a.label.localeCompare(b.label);
    node.insertAdjacentHTML('beforeend', `
      <strong>Item Visualization</strong>
      ${item.sort(byName).map((d) => ` <div class="${cssClass('checkbox')}"><input id="${id}0${d.type}" type="radio" name="renderer" value="${d.type}" ${(current === d.type) ? 'checked' : ''}><label for="${id}0${d.type}">${d.label}</label></div>`).join('')}
      <strong>Group Visualization</strong>
      ${group.sort(byName).map((d) => ` <div class="${cssClass('checkbox')}"><input id="${id}1${d.type}" type="radio" name="group" value="${d.type}" ${(currentGroup === d.type) ? 'checked' : ''}><label for="${id}1${d.type}">${d.label}</label></div>`).join('')}
      <strong>Summary Visualization</strong>
      ${summary.sort(byName).map((d) => ` <div class="${cssClass('checkbox')}"><input id="${id}2${d.type}" type="radio" name="summary" value="${d.type}" ${(currentSummary === d.type) ? 'checked' : ''}><label for="${id}2${d.type}">${d.label}</label></div>`).join('')}
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
