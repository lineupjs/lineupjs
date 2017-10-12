import {offset} from '../utils';

abstract class ADialog {

  static readonly visiblePopups: HTMLElement[] = [];

  static removePopup(popup: HTMLElement) {
    const index = ADialog.visiblePopups.indexOf(popup);
    if(index > -1) {
      ADialog.visiblePopups.splice(index, 1);
      popup.remove();
    }
    if(ADialog.visiblePopups.length === 0) {
      document.removeEventListener('keyup', escKeyListener);
    }
  }

  private static removeAllPopups() {
    if(ADialog.visiblePopups.length === 0) {
      return;
    }

    ADialog.visiblePopups.splice(0, ADialog.visiblePopups.length).forEach((d) => {
      d.remove();
    });
    document.removeEventListener('keyup', escKeyListener);
  }

  protected static registerPopup(popup: HTMLElement, replace: boolean = false) {
    if(replace) {
      ADialog.removeAllPopups();
    }
    if(ADialog.visiblePopups.length === 0) {
      document.addEventListener('keyup', escKeyListener);
    }
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
  protected makeMenuPopup(body: string) {
    const pos = offset(this.attachment);
    const parent = this.attachment.ownerDocument.body;
    parent.insertAdjacentHTML('beforeend', `
      <div class="lu-popup2 lu-popup-menu" style="left: ${pos.left}px; top: ${pos.top}px">${body}</div>`);
    const popup = <HTMLElement>parent.lastElementChild!;

    ADialog.registerPopup(popup, true);
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
    popup.querySelector('.cancel')!.addEventListener('click', (evt) => {
      handler.cancel();
      ADialog.removePopup(popup);
      evt.stopPropagation();
      evt.preventDefault();
    });
    popup.querySelector('.reset')!.addEventListener('click', (evt) => {
      handler.reset();
      evt.stopPropagation();
      evt.preventDefault();
    });
    popup.querySelector('.ok')!.addEventListener('click', (evt) => {
      if (handler.submit()) {
        ADialog.removeAllPopups();
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

  protected hidePopupOnClickOutside(popup: HTMLElement) {
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

function escKeyListener(evt:KeyboardEvent) {
  if (evt.which === 27 && ADialog.visiblePopups.length > 0) {
    const popup = ADialog.visiblePopups[ADialog.visiblePopups.length - 1];
    ADialog.removePopup(popup);
  }
}
