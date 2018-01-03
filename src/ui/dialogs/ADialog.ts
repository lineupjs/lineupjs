import Popper from 'popper.js';
import {registerPopup} from './manager';

export interface IDialogOptions {
  title: string;
  hideOnClickOutside: boolean;
  hideOnMoveOutside: boolean;
  fullDialog: boolean;
}

abstract class ADialog {

  private readonly options: Readonly<IDialogOptions> = {
    title: '',
    hideOnClickOutside: true,
    hideOnMoveOutside: false,
    fullDialog: false
  };

  readonly node: HTMLFormElement;
  private popper: Popper;

  constructor(readonly attachment: HTMLElement, options: Partial<IDialogOptions> = {}) {
    Object.assign(this.options, options);
    this.node = attachment.ownerDocument.createElement('form');
    this.node.classList.add('lu-dialog');
  }

  protected abstract build(node: HTMLElement): boolean|void;

  open() {
    if (this.build(this.node) === false) {
      return;
    }
    const parent = this.attachment.ownerDocument.body;

    if (this.options.title) {
      this.node.insertAdjacentHTML('afterbegin', `<h4>${this.options.title}</h4>`);
    }
    if (this.options.fullDialog) {
      this.node.insertAdjacentHTML('beforeend', `<div>
        <button type="submit" title="ok"></button>
        <button type="button" title="cancel"></button>
        <button type="reset" title="reset"></button>
      </div>`);
    }

    parent.appendChild(this.node);
    this.popper = new Popper(this.attachment, this.node, {
      placement: 'bottom-start'
    });

    const auto = this.find<HTMLInputElement>('input[autofocus]');
    if (auto) {
      auto.focus();
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

    registerPopup(this, this.options.hideOnClickOutside, this.options.hideOnMoveOutside);
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
    this.popper.destroy();
    this.node.remove();
  }
}

export default ADialog;
