import type ADialog from './ADialog';
import type Column from '../../model';
import { cssClass } from '../../styles';
import type { ILivePreviewOptions } from '../../config';
import { AEventDispatcher, IEventListener } from '../../internal';

/**
 * emitted a dialog is opened
 * @asMemberOf DialogManager
 * @param dialog the opened dialog
 * @event
 */
export declare function dialogOpened(dialog: ADialog): void;

/**
 * emitted a dialog is closed
 * @asMemberOf DialogManager
 * @param dialog the closed dialog
 * @param action the action how the dialog was closed
 * @event
 */
export declare function dialogClosed(dialog: ADialog, action: 'cancel' | 'confirm'): void;

export default class DialogManager extends AEventDispatcher {
  static readonly EVENT_DIALOG_OPENED = 'dialogOpened';
  static readonly EVENT_DIALOG_CLOSED = 'dialogClosed';

  private readonly escKeyListener = (evt: KeyboardEvent) => {
    if (evt.which === 27) {
      this.removeLast();
    }
  };

  private readonly openDialogs: ADialog[] = [];
  readonly node: HTMLElement;
  readonly livePreviews: Partial<ILivePreviewOptions>;
  readonly onDialogBackgroundClick: 'cancel' | 'confirm';

  constructor(options: {
    doc: Document;
    livePreviews: Partial<ILivePreviewOptions>;
    onDialogBackgroundClick: 'cancel' | 'confirm';
  }) {
    super();
    const doc = options.doc;
    this.livePreviews = options.livePreviews;
    this.onDialogBackgroundClick = options.onDialogBackgroundClick;
    this.node = doc.createElement('div');
    this.node.classList.add(cssClass('backdrop'));
    const backdrop = doc.createElement('div');
    backdrop.classList.add(cssClass('backdrop-bg'));
    this.node.appendChild(backdrop);
    this.node.onclick = () => {
      this.removeAll();
    };
  }

  protected createEventList() {
    return super.createEventList().concat([DialogManager.EVENT_DIALOG_CLOSED, DialogManager.EVENT_DIALOG_OPENED]);
  }

  on(type: typeof DialogManager.EVENT_DIALOG_OPENED, listener: typeof dialogOpened | null): this;
  on(type: typeof DialogManager.EVENT_DIALOG_CLOSED, listener: typeof dialogClosed | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }

  get maxLevel() {
    return this.openDialogs.reduce((acc, a) => Math.max(acc, a.level), 0);
  }

  setHighlight(mask: { left: number; top: number; width: number; height: number }) {
    const area = this.node.firstElementChild as HTMLElement;
    // @see https://bennettfeely.com/clippy/ -> select `Frame` example
    // use webkit prefix for safari
    area.style.clipPath = (area.style as any).webkitClipPath = `polygon(
      0% 0%,
      0% 100%,
      ${mask.left}px 100%,
      ${mask.left}px ${mask.top}px,
      ${mask.left + mask.width}px ${mask.top}px,
      ${mask.left + mask.width}px ${mask.top + mask.height}px,
      ${mask.left}px ${mask.top + mask.height}px,
      ${mask.left}px 100%,
      100% 100%,
      100% 0%
    )`;
  }

  setHighlightColumn(column: Column) {
    const root = this.node.parentElement!;
    if (!root) {
      this.clearHighlight();
      return;
    }
    const header = root.querySelector<HTMLElement>(`.${cssClass('header')}[data-col-id="${column.id}"]`);
    if (!header) {
      this.clearHighlight();
      return;
    }
    const base = header.getBoundingClientRect();
    const offset = root.getBoundingClientRect();
    this.setHighlight({
      left: base.left - offset.left,
      top: base.top - offset.top,
      width: base.width,
      height: offset.height,
    });
  }

  clearHighlight() {
    const area = this.node.firstElementChild as HTMLElement;
    area.style.clipPath = null;
  }

  private removeLast() {
    if (this.openDialogs.length === 0) {
      return;
    }
    this.remove(this.openDialogs[this.openDialogs.length - 1]);
  }

  removeAll() {
    if (this.openDialogs.length === 0) {
      return;
    }
    const all = this.openDialogs.splice(0, this.openDialogs.length);
    all.reverse().forEach((d) => d.cleanUp(this.onDialogBackgroundClick));
    this.takeDown();
  }

  triggerDialogClosed(dialog: ADialog, action: 'cancel' | 'confirm') {
    this.fire(DialogManager.EVENT_DIALOG_CLOSED, dialog, action);
  }

  remove(dialog: ADialog, handled = false) {
    const index = this.openDialogs.indexOf(dialog);
    if (index < 0) {
      return false;
    }
    // destroy self and all levels below that = after that
    const destroyed = this.openDialogs.splice(index, this.openDialogs.length - index);
    destroyed.reverse().forEach((d) => d.cleanUp(handled ? 'handled' : this.onDialogBackgroundClick));
    while (handled && this.openDialogs.length > 0 && this.openDialogs[this.openDialogs.length - 1].autoClose) {
      const dialog = this.openDialogs.pop()!;
      dialog.cleanUp(this.onDialogBackgroundClick);
    }

    if (this.openDialogs.length === 0) {
      this.takeDown();
    }
    return true;
  }

  removeAboveLevel(level: number) {
    // hide all dialogs which have a higher or equal level to the newly opened one
    this.openDialogs
      .filter((d) => d.level >= level)
      .reverse()
      .forEach((d) => this.remove(d));
  }

  removeLike(dialog: ADialog) {
    const similar = this.openDialogs.find((d) => dialog.equals(d));
    if (!similar) {
      return false;
    }
    this.remove(similar);
    return true;
  }

  private setUp() {
    this.node.ownerDocument!.addEventListener('keyup', this.escKeyListener, {
      passive: true,
    });
    this.node.style.display = 'block';
  }

  private takeDown() {
    this.clearHighlight();
    this.node.ownerDocument!.removeEventListener('keyup', this.escKeyListener);
    this.node.style.display = null;
  }

  push(dialog: ADialog) {
    this.removeAboveLevel(dialog.level);

    if (this.openDialogs.length === 0) {
      this.setUp();
    }

    this.openDialogs.push(dialog);
    this.fire(DialogManager.EVENT_DIALOG_OPENED, dialog);
  }
}
