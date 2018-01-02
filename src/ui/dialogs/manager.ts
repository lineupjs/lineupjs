import ADialog from './ADialog';


const visiblePopups: ADialog[] = [];


export function removePopup(popup: ADialog) {
  const index = visiblePopups.indexOf(popup);
  if (index > -1 && popup) {
    visiblePopups.splice(index, 1);
    popup.destroy();
  }
  if (visiblePopups.length === 0) {
    popup.node.ownerDocument.removeEventListener('keyup', escKeyListener);
  }
}

export function removeAllPopups() {
  if (visiblePopups.length === 0) {
    return;
  }

  visiblePopups.splice(0, visiblePopups.length).forEach((d) => {
    d.node.ownerDocument.removeEventListener('keyup', escKeyListener);
    d.destroy();
  });
}


export function registerPopup(popup: ADialog, hideOnClickOutside: boolean, hideOnMoveOutside: boolean) {
  if (visiblePopups.length === 0) {
    popup.node.ownerDocument.addEventListener('keyup', escKeyListener);
  }
  if (hideOnMoveOutside) {
    const closePopupOnMouseLeave = () => {
      if (visiblePopups[visiblePopups.length - 1] !== popup) {
        return;
      }
      removePopup(popup);
    };
    popup.node.addEventListener('mouseleave', closePopupOnMouseLeave);
  }

  if (hideOnClickOutside) {
    popup.node.addEventListener('click', (evt) => {
      // don't bubble up click events within the popup
      evt.stopPropagation();
    });
    popup.node.ownerDocument.body.addEventListener('click', clickListener);
  }

  visiblePopups.push(popup);
}

function escKeyListener(evt: KeyboardEvent) {
  if (evt.which === 27 && visiblePopups.length > 0) {
    const popup = visiblePopups[visiblePopups.length - 1];
    removePopup(popup);
  }
}

function clickListener(evt: KeyboardEvent) {
  removeAllPopups();
  evt.currentTarget.removeEventListener('click', clickListener);
}
