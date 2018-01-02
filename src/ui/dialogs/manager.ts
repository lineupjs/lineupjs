import Popper from 'popper.js';
import ADialog from './ADialog';


const visiblePopups: ADialog[] = [];

export function removePopup(popup: HTMLElement) {
  const index = visiblePopups.indexOf(popup);
  if (index > -1 && popup) {
    visiblePopups.splice(index, 1);
    popup.remove();
  }
  if (visiblePopups.length === 0) {
    popup.ownerDocument.removeEventListener('keyup', escKeyListener);
  }
}

export function removeAllPopups() {
  if (visiblePopups.length === 0) {
    return;
  }

  visiblePopups.splice(0, visiblePopups.length).forEach((d) => {
    d.ownerDocument.removeEventListener('keyup', escKeyListener);
    d.remove();
  });
}

export function registerPopup(popup: HTMLElement, popper: Popper, replace: boolean, enableCloseOnOutside = true) {
  if (replace) {
    removeAllPopups();
  }
  if (visiblePopups.length === 0) {
    popup.ownerDocument.addEventListener('keyup', escKeyListener);
  }

  const closePopupOnMouseLeave = () => {
    if (visiblePopups[visiblePopups.length - 1] !== popup) {
      return;
    }
    popup.removeEventListener('mouseleave', closePopupOnMouseLeave);
    popper.destroy();
    removePopup(popup);
  };

  if (enableCloseOnOutside) {
    popup.addEventListener('mouseleave', closePopupOnMouseLeave);
  }

  visiblePopups.push(popup);
}


function escKeyListener(evt: KeyboardEvent) {
  if (evt.which === 27 && ADialog.visiblePopups.length > 0) {
    const popup = ADialog.visiblePopups[ADialog.visiblePopups.length - 1];
    ADialog.removePopup(popup);
  }
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
