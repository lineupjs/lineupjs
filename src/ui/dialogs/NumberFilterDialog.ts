import {IMapAbleColumn} from '../../model';
import {ISummaryRenderer} from '../../renderer';
import {cssClass, engineCssClass} from '../../styles';
import {IRankingHeaderContext} from '../interfaces';
import ADialog, {IDialogContext} from './ADialog';

/** @internal */
export default class NumberFilterDialog extends ADialog {
  private readonly summary: ISummaryRenderer;

  constructor(private readonly column: IMapAbleColumn, dialog: IDialogContext, private readonly ctx: IRankingHeaderContext) {
    super(dialog);

    this.summary = ctx.summaryRenderer(this.column, true);
  }

  build(node: HTMLElement) {
    node.classList.add(cssClass('dialog-mapper'));

    // patch in lu-summary and renderer
    const summary = this.ctx.asElement(this.summary.template);
    summary.classList.add(cssClass('summary'), cssClass('renderer'));
    summary.dataset.renderer = this.column.getSummaryRenderer();
    summary.dataset.interactive = '';
    node.appendChild(summary);

    const summaryNode = <HTMLElement>this.node.getElementsByClassName(cssClass('summary'))[0]!;
    const r = this.summary.update(summaryNode);
    if (!r) {
      return;
    }
    summaryNode.classList.add(engineCssClass('loading'));
    r.then(() => {
      summaryNode.classList.remove(engineCssClass('loading'));
    });
  }
}
