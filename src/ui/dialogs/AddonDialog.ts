import type { Column } from '../../model';
import ADialog, { IDialogContext } from './ADialog';
import type { IToolbarDialogAddon, IRankingHeaderContext, IToolbarDialogAddonHandler } from '../interfaces';

/** @internal */
export default class AddonDialog extends ADialog {
  private readonly handlers: IToolbarDialogAddonHandler[] = [];

  constructor(
    private readonly column: Column,
    private readonly addons: IToolbarDialogAddon[],
    dialog: IDialogContext,
    private readonly ctx: IRankingHeaderContext,
    private readonly onClick?: () => void
  ) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    for (const addon of this.addons) {
      this.node.insertAdjacentHTML('beforeend', `<strong>${this.ctx.sanitize(addon.title)}</strong>`);
      this.handlers.push(addon.append(this.column, node, this.dialog, this.ctx));
    }
  }

  protected submit(): boolean {
    for (const handler of this.handlers) {
      if (handler.submit() === false) {
        return false;
      }
    }
    if (this.onClick) {
      this.onClick();
    }
    return true;
  }

  protected cancel() {
    for (const handler of this.handlers) {
      handler.cancel();
    }
  }

  protected reset() {
    for (const handler of this.handlers) {
      handler.reset();
    }
  }
}
