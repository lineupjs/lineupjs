import ADialog from './ADialog';


export default class DialogManager {

  private readonly escKeyListener = (evt: KeyboardEvent) => {
    if (evt.which === 27) {
      this.removeLast();
    }
  }

  private readonly openDialogs: ADialog[] = [];
  readonly node: HTMLElement;

  constructor(doc = document) {
    this.node = doc.createElement('div');
    this.node.classList.add('lu-backdrop');
    this.node.innerHTML = `<div></div>`;
    this.node.onclick = () => {
      this.removeAll();
    };
  }

  setHighlight(mask: { left: number, top: number, right: number, bottom: number}) {
    const area = <HTMLElement>this.node.firstElementChild;
    // @see http://bennettfeely.com/clippy/ -> select `Frame` example
    area.style.clipPath = `polygon(
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

  clearHighlight() {
    const area = <HTMLElement>this.node.firstElementChild;
    area.style.clipPath = null;
  }

  private removeLast() {
    if (this.openDialogs.length === 0) {
      return;
    }
    this.remove(this.openDialogs[this.openDialogs.length - 1]);
  }

  private removeAll() {
    if (this.openDialogs.length === 0) {
      return;
    }
    const all = this.openDialogs.splice(0, this.openDialogs.length);
    all.forEach((d) => d.destroy());
    this.takeDown();
  }

  remove(dialog: ADialog) {
    const index = this.openDialogs.indexOf(dialog);
    if (index < 0) {
      return false;
    }
    this.openDialogs.splice(index, 1);
    dialog.destroy();
    if (this.openDialogs.length === 0) {
      this.takeDown();
    }
  }

  private setUp() {
    this.node.ownerDocument.addEventListener('keyup', this.escKeyListener);
    this.node.style.display = 'block';
  }

  private takeDown() {
    this.node.ownerDocument.removeEventListener('keyup', this.escKeyListener);
    this.node.style.display = null;
  }

  push(dialog: ADialog) {
    // hide all dialogs which have a higher or equal level to the newly opened one
    this.openDialogs.filter((d) => d.level <= dialog.level).forEach((d) => this.remove(d));

    if (this.openDialogs.length === 0) {
      this.setUp();
    }

    this.openDialogs.push(dialog);
  }
}
