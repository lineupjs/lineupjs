import Popper from 'popper.js';
import DialogManager from './DialogManager';
import merge from '../../internal/merge';
import {cssClass} from '../../styles';

export interface IDialogOptions {
  title: string;
  fullDialog: boolean;
  resetPossible: boolean;

  // popper options
  placement?: Popper.Placement;
  eventsEnabled?: boolean;
  modifiers?: Popper.Modifiers;
  toggleDialog: boolean;
}

export interface IDialogContext {
  attachment: HTMLElement;
  level: number;
  manager: DialogManager;
  idPrefix: string;
}

abstract class ADialog {

  private readonly options: Readonly<IDialogOptions> = {
    title: '',
    fullDialog: false,
    resetPossible: true,
    placement: 'bottom-start',
    toggleDialog: true,
    modifiers: {
    }
  };

  readonly node: HTMLFormElement;
  private popper: Popper | null = null;

  constructor(protected readonly dialog: Readonly<IDialogContext>, options: Partial<IDialogOptions> = {}) {
    Object.assign(this.options, options);
    this.node = dialog.attachment.ownerDocument!.createElement('form');
    this.node.classList.add(cssClass('dialog'));
  }

  get attachment() {
    return this.dialog.attachment;
  }

  get level() {
    return this.dialog.level;
  }

  protected abstract build(node: HTMLElement): boolean | void;

  equals(that: ADialog) {
    return this.dialog.level === that.dialog.level && this.dialog.attachment === that.dialog.attachment;
  }

  protected appendDialogButtons() {
    this.node.insertAdjacentHTML('beforeend', `<div class="${cssClass('dialog-buttons')}">
      <button class="${cssClass('dialog-button')}" type="submit" title="Apply"></button>
      <button class="${cssClass('dialog-button')}" type="button" title="Cancel"></button>
      <button class="${cssClass('dialog-button')}" type="reset" title="Reset to default values" ${!this.options.resetPossible ? 'style="visibility: hidden"': ''}></button>
    </div>`);
  }

  open() {
    if (this.options.toggleDialog && this.dialog.manager.removeLike(this)) {
      return;
    }
    if (this.build(this.node) === false) {
      return;
    }
    const parent = <HTMLElement>this.attachment.closest(`.${cssClass()}`)!;

    if (this.options.title) {
      this.node.insertAdjacentHTML('afterbegin', `<strong>${this.options.title}</strong>`);
    }
    if (this.options.fullDialog) {
      this.appendDialogButtons();
    }

    parent.appendChild(this.node);
    this.popper = new Popper(this.attachment, this.node, merge({
      modifiers: {
        preventOverflow: {
          boundariesElement: parent
        }
      }
    }, this.options));

    const auto = this.find<HTMLInputElement>('input[autofocus]');
    if (auto) {
      // delay such that it works
      self.setTimeout(() => auto.focus());
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
    const cancel = this.find<HTMLButtonElement>('button[title=Cancel]');
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

  protected forEach<M extends Element, T>(selector: string, callback: (d: M, i: number) => T): T[] {
    return (<M[]>Array.from(this.node.querySelectorAll(selector))).map(callback);
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
    if (this.popper) {
      this.popper.destroy();
    }
    this.node.remove();
  }
}

export default ADialog;
