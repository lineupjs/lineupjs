import NumberColumn from '../../model/NumberColumn';
import ADialog, {IDialogContext} from './ADialog';

/** @internal */
export default class StratifyThresholdDialog extends ADialog {

  private readonly before: number[];

  constructor(private readonly column: NumberColumn, dialog: IDialogContext) {
    super(dialog, {
      fullDialog: true
    });
    this.before = this.column.getStratifyThresholds();
  }

  protected build(node: HTMLElement) {
    if (this.column.isGroupedBy() >= 0) {
      // disable grouping
      this.column.groupByMe();
      return false;
    }
    const domain = this.column.getOriginalMapping().domain;
    node.insertAdjacentHTML('beforeend', `<h4>Threshold: </h4><input
        type="number"
        size="15"
        value="${this.before.length > 0 ? this.before[0] : (domain[1] - domain[0]) / 2}"
        required
        autofocus
        min="${domain[0]}"
        max="${domain[1]}"
        step="any"
      >`);
    return true;
  }

  reset() {
    const domain = this.column.getOriginalMapping().domain;
    this.findInput('input[type="number"]').value = `${this.before.length > 0 ? this.before[0] : (domain[1] - domain[0]) / 2}`;
    this.column.setStratifyThresholds(this.before);
  }

  submit() {
    const newValue = +this.findInput('input[type="number"]').value;
    this.column.setStratifyThresholds([newValue]);
    this.column.groupByMe();
    return true;
  }
}
