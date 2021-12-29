import type { IDialogContext } from './ADialog';
import APopup from './APopup';

/** @internal */
export interface IInputNumberOptions {
  min: number;
  max: number;
  step: number | 'any';
  value: number;
  label: string | null;
}

/** @internal */
export default class InputNumberDialog extends APopup {
  private readonly ioptions: Readonly<IInputNumberOptions> = {
    min: NaN,
    max: NaN,
    step: 'any',
    value: NaN,
    label: null,
  };

  constructor(
    dialog: IDialogContext,
    private readonly callback: (value: number) => void,
    options: Partial<IInputNumberOptions> = {}
  ) {
    super(dialog);
    Object.assign(this.ioptions, options);
  }

  protected build(node: HTMLElement) {
    const o = this.ioptions;
    node.insertAdjacentHTML(
      'beforeend',
      `
     <input type="number" value="${
       Number.isNaN(o.value) ? '' : String(o.value)
     }" required autofocus placeholder="${this.dialog.sanitize(o.label ? o.label : 'enter number')}" ${
        Number.isNaN(o.min) ? '' : ` min="${o.min}"`
      } ${Number.isNaN(o.max) ? '' : ` max="${o.max}"`} step="${o.step}">
    `
    );
    this.enableLivePreviews('input');
  }

  submit() {
    this.callback(this.findInput('input[type=number]').valueAsNumber);
    return true;
  }
}
