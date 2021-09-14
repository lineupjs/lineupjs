import type { DateColumn, IDateFilter } from '../../model';
import { noDateFilter } from '../../model/internalDate';
import { createDateFilter } from '../../renderer/DateHistogramCellRenderer';
import { cssClass } from '../../styles';
import ADialog, { IDialogContext } from './ADialog';
import type { IRankingHeaderContext } from '../interfaces';

/** @internal */
export default class DateFilterDialog extends ADialog {
  private readonly before: IDateFilter;
  private handler: { reset: () => void; submit: () => void; cleanUp: () => void } | null = null;

  constructor(
    private readonly column: DateColumn,
    dialog: IDialogContext,
    private readonly ctx: IRankingHeaderContext
  ) {
    super(dialog, {
      livePreview: 'filter',
      cancelSubDialogs: true,
    });
    this.before = this.column.getFilter() ?? noDateFilter();
  }

  protected build(node: HTMLElement) {
    node.classList.add(cssClass('dialog-mapper'));

    this.handler = createDateFilter(
      this.column,
      node,
      {
        dialogManager: this.ctx.dialogManager,
        idPrefix: this.ctx.idPrefix,
        tasks: this.ctx.provider.getTaskExecutor(),
        sanitize: this.ctx.sanitize,
      },
      this.showLivePreviews()
    );
  }

  cleanUp(action: 'cancel' | 'confirm' | 'handled') {
    super.cleanUp(action);
    this.handler!.cleanUp();
  }

  protected reset() {
    this.handler!.reset();
  }

  protected submit() {
    this.handler!.submit();
    return true;
  }

  protected cancel() {
    this.column.setFilter(this.before);
  }
}
