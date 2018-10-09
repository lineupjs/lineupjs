import {IMapAbleColumn} from '../../model';
import {ISummaryRenderer} from '../../renderer/interfaces';
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
    node.classList.add('lu-dialog-mapper');

    // patch in lu-summary and renderer
    node.insertAdjacentHTML('beforeend', this.summary.template);
    const summary = <HTMLElement>node.lastElementChild!;
    summary.classList.add('lu-summary', 'lu-renderer');
    summary.dataset.renderer = this.column.getSummaryRenderer();
    summary.dataset.interactive = '';
    node.appendChild(summary);

    this.summary.update(<HTMLElement>this.node.querySelector('.lu-summary')!, this.ctx.statsOf(this.column));
  }
}
