import type { IMapAbleColumn, INumberFilter } from '../../model';
import { createNumberFilter } from '../../renderer/HistogramCellRenderer';
import { cssClass } from '../../styles';
import type { IRankingHeaderContext } from '../interfaces';
import ADialog, { IDialogContext } from './ADialog';

/** @internal */
export default class NumberFilterDialog extends ADialog {
  private readonly before: INumberFilter;
  private handler: { reset: () => void; submit: () => void; cleanUp: () => void } | null = null;

  constructor(
    private readonly column: IMapAbleColumn,
    dialog: IDialogContext,
    private readonly ctx: IRankingHeaderContext
  ) {
    super(dialog, {
      livePreview: 'filter',
      cancelSubDialogs: true,
    });

    this.before = column.getFilter();
  }

  build(node: HTMLElement) {
    node.classList.add(cssClass('dialog-mapper'));

    this.handler = createNumberFilter(
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
