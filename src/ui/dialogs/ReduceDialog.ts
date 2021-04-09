import { EAdvancedSortMethod, ReduceColumn } from '../../model';
import ADialog, { IDialogContext } from './ADialog';
import { sortMethods } from './utils';
import type { IToolbarDialogAddonHandler } from '../interfaces';

/** @internal */
export default class ReduceDialog extends ADialog {
  private handler: IToolbarDialogAddonHandler | null = null;

  constructor(private readonly column: ReduceColumn, dialog: IDialogContext) {
    super(dialog, {
      livePreview: 'reduce',
    });
  }

  protected build(node: HTMLElement) {
    const wrapper = {
      getSortMethod: () => this.column.getReduce(),
      setSortMethod: (s: EAdvancedSortMethod) => this.column.setReduce(s),
    };
    this.handler = sortMethods(node, wrapper, Object.keys(EAdvancedSortMethod));

    this.enableLivePreviews(this.handler.elems);
  }

  protected submit() {
    return this.handler!.submit();
  }

  protected reset() {
    this.handler!.reset();
  }

  protected cancel() {
    this.handler!.cancel();
  }
}
