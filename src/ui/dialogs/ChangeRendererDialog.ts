import type { Column } from '../../model';
import type { IRankingHeaderContext, IRenderInfo } from '../interfaces';
import ADialog, { IDialogContext } from './ADialog';
import { cssClass } from '../../styles';

/** @internal */
export default class ChangeRendererDialog extends ADialog {
  private readonly before: { renderer: string; group: string; summary: string };

  constructor(private readonly column: Column, dialog: IDialogContext, private readonly ctx: IRankingHeaderContext) {
    super(dialog, {
      livePreview: 'vis',
    });

    this.before = {
      renderer: column.getRenderer(),
      group: column.getGroupRenderer(),
      summary: column.getSummaryRenderer(),
    };
  }

  protected build(node: HTMLElement) {
    const current = this.column.getRenderer();
    const currentGroup = this.column.getGroupRenderer();
    const currentSummary = this.column.getSummaryRenderer();
    const { item, group, summary } = this.ctx.getPossibleRenderer(this.column);

    console.assert(item.length > 1 || group.length > 1 || summary.length > 1); // otherwise no need to show this

    const byName = (a: IRenderInfo, b: IRenderInfo) => a.label.localeCompare(b.label);
    const s = this.ctx.sanitize;
    node.insertAdjacentHTML(
      'beforeend',
      `
      <strong>Item Visualization</strong>
      ${item
        .sort(byName)
        .map(
          (d) =>
            ` <label class="${cssClass('checkbox')}"><input type="radio" name="renderer" value="${s(d.type)}" ${
              current === d.type ? 'checked' : ''
            }><span>${s(d.label)}</span></label>`
        )
        .join('')}
      <strong>Group Visualization</strong>
      ${group
        .sort(byName)
        .map(
          (d) =>
            ` <label class="${cssClass('checkbox')}"><input type="radio" name="group" value="${s(d.type)}" ${
              currentGroup === d.type ? 'checked' : ''
            }><span>${s(d.label)}</span></label>`
        )
        .join('')}
      <strong>Summary Visualization</strong>
      ${summary
        .sort(byName)
        .map(
          (d) =>
            ` <label class="${cssClass('checkbox')}"><input type="radio" name="summary" value="${s(d.type)}" ${
              currentSummary === d.type ? 'checked' : ''
            }><span>${s(d.label)}</span></label>`
        )
        .join('')}
    `
    );

    this.enableLivePreviews('input[type=radio]');
  }

  protected cancel() {
    this.column.setRenderer(this.before.renderer);
    this.column.setGroupRenderer(this.before.group);
    this.column.setSummaryRenderer(this.before.summary);
  }

  protected reset() {
    const desc = this.column.desc;
    const r = this.findInput(`input[name=renderer][value="${desc.renderer || desc.type}"]`);
    if (r) {
      r.checked = true;
    }
    const g = this.findInput(`input[name=group][value="${desc.groupRenderer || desc.type}"]`);
    if (g) {
      g.checked = true;
    }
    const s = this.findInput(`input[name=summary][value="${desc.summaryRenderer || desc.type}"]`);
    if (s) {
      s.checked = true;
    }
  }

  protected submit() {
    const renderer = this.findInput('input[name=renderer]:checked').value;
    const group = this.findInput('input[name=group]:checked').value;
    const summary = this.findInput('input[name=summary]:checked').value;

    this.column.setRenderer(renderer);
    this.column.setGroupRenderer(group);
    this.column.setSummaryRenderer(summary);

    return true;
  }
}
