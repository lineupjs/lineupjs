import ADialog, {IDialogContext} from './ADialog';
import {timeFormat} from 'd3-time-format';

/** @internal */
export interface IInputDateOptions {
  value: Date | null;
  label: string | null;
}

/** @internal */
export default class InputDateDialog extends ADialog {

  private readonly ioptions: Readonly<IInputDateOptions> = {
    value: null,
    label: null
  };

  constructor(dialog: IDialogContext, private readonly callback: (value: Date | null) => void, options: Partial<IInputDateOptions> = {}) {
    super(dialog);
    Object.assign(this.ioptions, options);
  }

  protected build(node: HTMLElement) {
    const o = this.ioptions;

    const f = timeFormat('%Y-%m-%d');

    node.insertAdjacentHTML('beforeend', `
     <input type="date" value="${o.value ? f(o.value) : ''}" required autofocus placeholder="${o.label ? o.label : 'enter date'}">
    `);
  }

  submit() {
    this.callback(this.findInput('input[type=date]').valueAsDate);
    return true;
  }
}
