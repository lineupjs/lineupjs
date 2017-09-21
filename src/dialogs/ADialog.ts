import {offset} from '../utils';

abstract class ADialog {

  protected static readonly visiblePopups: HTMLElement[] = [];

  private static removeAllPopups() {
    ADialog.visiblePopups.splice(0, ADialog.visiblePopups.length).forEach((d) => {
      d.remove();
    });
  }

  protected static registerPopup(popup: HTMLElement) {
    ADialog.removeAllPopups();
    ADialog.visiblePopups.push(popup);
  }

  constructor(readonly attachment: HTMLElement, private readonly title: string) {
  }

  abstract openDialog(): void;

  /**
   * creates a simple popup dialog under the given attachment
   * @param body
   * @returns {Selection<any>}
   */
  makeMenuPopup(body: string) {
    const pos = offset(this.attachment);
    const parent = this.attachment.ownerDocument.body;
    parent.insertAdjacentHTML('beforeend', `
      <div class="lu-popup2 lu-popup-menu" style="left: ${pos.left}px; top: ${pos.top}px">${body}</div>`);
    const popup = <HTMLElement>parent.lastElementChild!;

    const escKey = (evt:KeyboardEvent) => {
      if (evt.which === 27) {
        document.removeEventListener('keyup', escKey);
        popup.remove();
      }
    };

    document.addEventListener('keyup', escKey);

    ADialog.registerPopup(popup)
    this.hidePopupOnClickOutside(popup);
    return popup;
  }

  /**
   * creates a simple popup dialog under the given attachment
   * @param body
   * @returns {Selection<any>}
   */
  makePopup(body: string) {
    const pos = offset(this.attachment);
    const parent = this.attachment.ownerDocument.body;
    parent.insertAdjacentHTML('beforeend', `
      <div class="lu-popup2" style="left: ${pos.left}px; top: ${pos.top}px">${this.dialogForm(body)}</div>`);
    const popup = <HTMLElement>parent.lastElementChild!;

    const escKey = (evt:KeyboardEvent) => {
      if (evt.which === 27) {
        document.removeEventListener('keyup', escKey);
        popup.remove();
      }
    };

    document.addEventListener('keyup', escKey);

    const auto = <HTMLInputElement>popup.querySelector('input[autofocus]');
    if (auto) {
      auto.focus();
    }
    ADialog.registerPopup(popup);
    this.hidePopupOnClickOutside(popup);
    return popup;
  }

  makeChoosePopup(body: string) {
    const pos = offset(this.attachment);
    const parent = this.attachment.ownerDocument.body;
    parent.insertAdjacentHTML('beforeend', `
      <div class="lu-popup2 chooser" style="left: ${pos.left}px; top: ${pos.top}px">${this.basicDialog(body)}</div>`);
    const popup = <HTMLElement>parent.lastElementChild!;

    const escKey = (evt:KeyboardEvent) => {
      if (evt.which === 27) {
        document.removeEventListener('keyup', escKey);
        popup.remove();
      }
    };

    document.addEventListener('keyup', escKey);

    ADialog.registerPopup(popup);
    this.hidePopupOnClickOutside(popup);
    return popup;
  }

  dialogForm(body: string, addCloseButtons: boolean = true) {
    return `<span style="font-weight: bold" class="lu-popup-title">${this.title}</span>
            <form onsubmit="return false">
                ${body}
                ${addCloseButtons ?
      '<button type = "submit" class="ok fa fa-check" title="ok"></button>' +
      '<button type = "reset" class="cancel fa fa-times" title="cancel">' +
      '</button><button type = "button" class="reset fa fa-undo" title="reset"></button></form>' : ''}
            </form>`;
  }

  protected onButton(popup: HTMLElement, handler: { submit: () => boolean, reset: () => void, cancel: () => void }) {
    popup.querySelector('.cancel')!.addEventListener('click', () => {
      handler.cancel();
      popup.remove();
    });
    popup.querySelector('.reset')!.addEventListener('click', () => {
      handler.reset();
    });
    popup.querySelector('.ok')!.addEventListener('click', () => {
      if (handler.submit()) {
        popup.remove();
      }
    });
  }

  private basicDialog(body: string) {
    return `<span style="font-weight: bold" class="lu-popup-title">${this.title}</span>
            <form onsubmit="return false">
                ${body}
            </form>`;
  }

  private hidePopupOnClickOutside(popup: HTMLElement) {
    const body = this.attachment.ownerDocument.body;
    popup.addEventListener('click', (evt) => {
      // don't bubble up click events within the popup
      evt.stopPropagation();
    });
    const l = () => {
      ADialog.removeAllPopups();
      body.removeEventListener('click', l);
    };
    body.addEventListener('click', l);
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
