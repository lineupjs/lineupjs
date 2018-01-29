import Popper from 'popper.js';

class DialogStack {

  readonly openDialogs:ADialog[] = [];

  private backdrop:HTMLElement;

  add(dialog:ADialog) {
    // add esc listener and backdrop for first dialog
    if(this.openDialogs.length === 0) {
      dialog.attachment.ownerDocument.addEventListener('keyup', escKeyListener);

      dialog.attachment.ownerDocument.body.insertAdjacentHTML('beforeend', `<div class="lu-backdrop"></div>`);
      this.backdrop = <HTMLElement>dialog.attachment.ownerDocument.body.lastElementChild!;

    // check for every further dialog if the same dialog is already open -> if yes, close it == toggle behavior
    } else if(this.openDialogs[this.openDialogs.length - 1].constructor === dialog.constructor) {
      this.removeLast();
      return;
    }

    this.openDialogs.push(dialog);
    dialog.open();
    this.hideOnBackdropClick(dialog.node);
  }

  remove(dialog:ADialog) {
    const index = this.openDialogs.indexOf(dialog);
    if(index > -1 && dialog) {
      this.openDialogs.splice(index, 1);
      dialog.close();
    }
    if(this.openDialogs.length === 0) {
      dialog.attachment.ownerDocument.removeEventListener('keyup', escKeyListener);
      this.backdrop.remove();
    }
  }

  removeLast() {
    const dialog = this.openDialogs[this.openDialogs.length - 1];
    this.remove(dialog);
  }

  removeAll() {
    if(this.openDialogs.length === 0) {
      return;
    }

    this.openDialogs.splice(0, this.openDialogs.length).forEach((d) => {
      d.attachment.ownerDocument.removeEventListener('keyup', escKeyListener);
      d.close();
    });

    this.backdrop.remove();
  }

  private hideOnBackdropClick(dialogNode: HTMLElement) {
    dialogNode.addEventListener('click', (evt) => {
      // don't bubble up click events within the popup
      evt.stopPropagation();
    });
    const l = () => {
      this.removeAll();
      this.backdrop.removeEventListener('click', l);
      this.backdrop.remove();
    };
    this.backdrop.addEventListener('click', l);
  }
}

// single instance
export const dialogStack = new DialogStack();


abstract class ADialog {

  public node: HTMLElement;
  protected popper: Popper;

  constructor(public readonly attachment: HTMLElement, private readonly title: string) {
  }

  protected abstract build():HTMLElement;

  open(): void {
    this.node = this.build();

    this.popper = new Popper(this.attachment, this.node, {
      placement: 'bottom-start',
      removeOnDestroy: true
    });
  };

  close(): void {
    this.popper.destroy();
  };


  /**
   * creates a simple popup dialog under the given attachment
   * @param body
   * @returns {HTMLElement}
   */
  protected makeMenuPopup(body: string):HTMLElement {
    const parent = this.attachment.ownerDocument.body;
    parent.insertAdjacentHTML('beforeend', `<div class="lu-popup2 lu-popup-menu">${body}</div>`);
    return <HTMLElement>parent.lastElementChild!;
  }

  /**
   * creates a simple popup dialog under the given attachment
   * @param body
   * @returns {HTMLElement}
   */
  makePopup(body: string):HTMLElement {
    const parent = this.attachment.ownerDocument.body;
    parent.insertAdjacentHTML('beforeend', `<div class="lu-popup2">${this.dialogForm(body)}</div>`);
    const popup = <HTMLElement>parent.lastElementChild!;

    const auto = <HTMLInputElement>popup.querySelector('input[autofocus]');
    if (auto) {
      auto.focus();
    }

    return popup;
  }

  makeChoosePopup(body: string):HTMLElement {
    const parent = this.attachment.ownerDocument.body;
    parent.insertAdjacentHTML('beforeend', `<div class="lu-popup2 chooser">${this.basicDialog(body)}</div>`);
    return <HTMLElement>parent.lastElementChild!;
  }

  dialogForm(body: string, addCloseButtons: boolean = true) {
    return `<span style="font-weight: bold" class="lu-popup-title">${this.title}</span>
            <form onsubmit="return false">
                ${body}
                ${addCloseButtons ?
      '<button type = "submit" class="ok fa fa-check" title="Apply"></button>' +
      '<button type = "reset" class="cancel fa fa-times" title="Cancel">' +
      '</button><button type = "button" class="reset fa fa-undo" title="Reset to default values"></button></form>' : ''}
            </form>`;
  }

  protected onButton(node:HTMLElement, handler: { submit: () => boolean, reset: () => void, cancel: () => void }) {
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

function escKeyListener(evt:KeyboardEvent) {
  if (evt.which === 27 && dialogStack.openDialogs.length > 0) {
    dialogStack.removeLast();
  }
}

export default ADialog;
