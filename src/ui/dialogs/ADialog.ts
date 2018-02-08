import Popper from 'popper.js';
import DialogManager from './DialogManager';

export interface IDialogOptions {
  title: string;
  fullDialog: boolean;

  // popper options
  placement?: Popper.Placement;
  eventsEnabled?: boolean;
  modifiers?: Popper.Modifiers;
}

export interface IDialogContext {
  attachment: HTMLElement;
  level: number;
  manager: DialogManager;
}

abstract class ADialog {

  private readonly options: Readonly<IDialogOptions> = {
    title: '',
    fullDialog: false,
    placement: 'bottom-start'
  };

  readonly node: HTMLFormElement;
  private popper: Popper;

  constructor(protected readonly dialog: IDialogContext, options: Partial<IDialogOptions> = {}) {
    Object.assign(this.options, options);
    this.node = dialog.attachment.ownerDocument.createElement('form');
    this.node.classList.add('lu-dialog');
  }

  get attachment() {
    return this.dialog.attachment;
  }

  get level() {
    return this.dialog.level;
  }

  protected abstract build(node: HTMLElement): boolean|void;

  open() {
    if (this.build(this.node) === false) {
      return;
    }
    const parent = <HTMLElement>this.attachment.closest('.lu')!;

    if (this.options.title) {
      this.node.insertAdjacentHTML('afterbegin', `<h4>${this.options.title}</h4>`);
    }
    if (this.options.fullDialog) {
      this.node.insertAdjacentHTML('beforeend', `<div>
        <button type="submit" title="Apply"></button>
        <button type="button" title="Cancel"></button>
        <button type="reset" title="Reset to default values"></button>
      </div>`);
    }

    parent.appendChild(this.node);
    this.popper = new Popper(this.attachment, this.node, this.options);

    const auto = this.find<HTMLInputElement>('input[autofocus]');
    if (auto) {
      // delay such that it works
      setTimeout(() => auto.focus());
    }

    const reset = this.find<HTMLButtonElement>('button[type=reset]');
    if (reset) {
      reset.onclick = (evt) => {
        evt.stopPropagation();
        evt.preventDefault();
        this.reset();
      };
    }
    this.node.onsubmit = (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      if (!this.node.checkValidity()) {
        return false;
      }
      if (this.submit()) {
        this.destroy();
      }
      return false;
    };
    const cancel = this.find<HTMLButtonElement>('button[title=cancel]');
    if (cancel) {
      cancel.onclick = (evt) => {
        evt.stopPropagation();
        evt.preventDefault();
        this.destroy();
      };
    }

    this.dialog.manager.push(this);
  }

  protected find<T extends HTMLElement>(selector: string): T {
    return <T>this.node.querySelector(selector);
  }

  protected findInput(selector: string) {
    return this.find<HTMLInputElement>(selector);
  }

  protected forEach<T>(selector: string, callback: (d: HTMLElement, i: number)=> T): T[] {
    return Array.from(this.node.querySelectorAll(selector)).map(callback);
  }

  protected reset() {
    // hook
  }

  protected submit(): boolean {
    // hook
    return true;
  }

  destroy() {
    this.dialog.manager.remove(this);
    this.popper.destroy();
    this.node.remove();
  }
}

export default ADialog;
