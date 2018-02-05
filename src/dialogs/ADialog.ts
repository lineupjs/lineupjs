import Popper from 'popper.js';

class DialogStack {

  readonly openDialogs: ADialog[] = [];

  private backdrop: HTMLElement;

  private backdropListener = () => {
    this.removeAll();
  };

  private escKeyListener = (evt: KeyboardEvent) => {
    if (evt.which === 27 && this.openDialogs.length > 0) {
      this.removeLast();
    }
  };

  add(dialog: ADialog): boolean {
    // add esc listener and backdrop for first dialog
    if (this.openDialogs.length === 0) {
      dialog.attachment.ownerDocument.addEventListener('keyup', this.escKeyListener);

      dialog.attachment.ownerDocument.body.insertAdjacentHTML('beforeend', `<div class="lu-backdrop"><div class="lu-backdrop-mask"></div></div>`);
      this.backdrop = <HTMLElement>dialog.attachment.ownerDocument.body.lastElementChild!;
      this.backdrop.addEventListener('click', this.backdropListener);

      const mask = dialog.backdropMaskRect();
      if (mask) {
        // @see http://bennettfeely.com/clippy/ -> select `Frame` example
        (<HTMLElement>this.backdrop.querySelector('.lu-backdrop-mask'))!.style.clipPath = `polygon(
          0% 0%,
          0% 100%,
          ${mask.left}px 100%,
          ${mask.left}px ${mask.top}px,
          ${mask.right}px ${mask.top}px,
          ${mask.right}px ${mask.bottom}px,
          ${mask.left}px ${mask.bottom}px,
          ${mask.left}px 100%,
          100% 100%,
          100% 0%
        )`;
      }

      // check for every further dialog if the same dialog is already open -> if yes, close it == toggle behavior
    } else if (this.openDialogs[this.openDialogs.length - 1].constructor === dialog.constructor) {
      this.removeLast();
      return false;

      // if dialogs are not a menu, close previous one before opening the new dialog
    } else if (!this.openDialogs[this.openDialogs.length - 1].isMenuDialog && !dialog.isMenuDialog) {
      this.removeLast();
    }

    this.openDialogs.push(dialog);
    return true;
  }

  remove(dialog: ADialog) {
    const index = this.openDialogs.indexOf(dialog);
    if (index > -1 && dialog) {
      this.openDialogs.splice(index, 1);
      dialog.close(false);
    }

    if (this.openDialogs.length > 0) {
      return;
    }

    dialog.attachment.ownerDocument.removeEventListener('keyup', this.escKeyListener);
    this.backdrop.removeEventListener('click', this.backdropListener);
    this.backdrop.remove();
  }

  removeLast() {
    this.remove(this.openDialogs[this.openDialogs.length - 1]);
  }

  removeAll() {
    if (this.openDialogs.length === 0) {
      return;
    }

    this.openDialogs
      .slice(0) // temporary copy since the original array will be modified
      .forEach((dialog) => this.remove(dialog));
  }
}

// single instance
const dialogStack = new DialogStack();

export interface IMaskRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

abstract class ADialog {

  public isMenuDialog: boolean = false;

  public backdropMaskRect: () => IMaskRect;

  public node: HTMLElement;

  private popper: Popper;

  constructor(public readonly attachment: HTMLElement, private readonly title: string) {

  }

  protected abstract build(): HTMLElement;

  open(): void {
    if (!dialogStack.add(this)) {
      return; // not added because of toggle behavior
    }

    this.node = this.build();
    this.node.addEventListener('click', (evt) => {
      // prevent bubble up click events within the popup
      evt.stopPropagation();
    });

    this.popper = new Popper(this.attachment, this.node, {
      placement: 'bottom-start',
      removeOnDestroy: true
    });
  }

  close(removeFromStack: boolean = true): void {
    this.popper.destroy();

    if (removeFromStack) {
      dialogStack.remove(this);
    }
  }


  /**
   * creates a simple popup dialog under the given attachment
   * @param body
   * @returns {HTMLElement}
   */
  protected makeMenuPopup(body: string): HTMLElement {
    const parent = this.attachment.ownerDocument.body;
    parent.insertAdjacentHTML('beforeend', `<div class="lu-popup2 lu-popup-menu">${body}</div>`);
    return <HTMLElement>parent.lastElementChild!;
  }

  /**
   * creates a simple popup dialog under the given attachment
   * @param body
   * @returns {HTMLElement}
   */
  protected makePopup(body: string): HTMLElement {
    const parent = this.attachment.ownerDocument.body;
    parent.insertAdjacentHTML('beforeend', `<div class="lu-popup2">${this.dialogForm(body)}</div>`);
    const popup = <HTMLElement>parent.lastElementChild!;

    const auto = <HTMLInputElement>popup.querySelector('input[autofocus]');
    if (auto) {
      auto.focus();
    }

    return popup;
  }

  protected makeChoosePopup(body: string): HTMLElement {
    const parent = this.attachment.ownerDocument.body;
    parent.insertAdjacentHTML('beforeend', `<div class="lu-popup2 chooser">${this.basicDialog(body)}</div>`);
    return <HTMLElement>parent.lastElementChild!;
  }

  protected dialogForm(body: string, addCloseButtons: boolean = true) {
    return `<span style="font-weight: bold" class="lu-popup-title">${this.title}</span>
            <form onsubmit="return false">
                ${body}
                ${addCloseButtons ?
      '<button type = "submit" class="ok fa fa-check" title="Apply"></button>' +
      '<button type = "reset" class="cancel fa fa-times" title="Cancel">' +
      '</button><button type = "button" class="reset fa fa-undo" title="Reset to default values"></button></form>' : ''}
            </form>`;
  }

  protected onButton(node: HTMLElement, handler: { submit: () => boolean, reset: () => void, cancel: () => void }) {
    node.querySelector('.cancel')!.addEventListener('click', (evt) => {
      handler.cancel();
      dialogStack.remove(this);
      evt.stopPropagation();
      evt.preventDefault();
    });
    node.querySelector('.reset')!.addEventListener('click', (evt) => {
      handler.reset();
      evt.stopPropagation();
      evt.preventDefault();
    });
    node.querySelector('.ok')!.addEventListener('click', (evt) => {
      if (handler.submit()) {
        dialogStack.removeAll();
      }
      evt.stopPropagation();
      evt.preventDefault();
    });
  }

  private basicDialog(body: string) {
    return `<span style="font-weight: bold" class="lu-popup-title">${this.title}</span>
            <form onsubmit="return false">
                ${body}
            </form>`;
  }
}

export function sortByProperty(prop: string) {
  return (a: any, b: any) => {
    const av = a[prop],
      bv = b[prop];
    return av.toLowerCase().localeCompare(bv.toLowerCase());
  };
}

export default ADialog;
