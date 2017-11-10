import ADialog from './ADialog';
import NumberColumn from '../model/NumberColumn';

export default class StratifyThresholdDialog extends ADialog {

  /**
   * opens a dialog for editing the link of a column
   * @param column the column to rename
   * @param header the visual header element of this column
   */
  constructor(private readonly column: NumberColumn, header: HTMLElement) {
    super(header, 'Stratify By Threshold');
  }

  openDialog() {
    if (this.column.isGroupedBy() >= 0) {
      // disable grouping
      this.column.groupByMe();
      return;
    }
    const domain = this.column.getOriginalMapping().domain;
    const bak = this.column.getStratifyTresholds();

    const t = `<input
        type="number"
        size="15"
        value="${bak.length > 0 ? bak[0] : (domain[1] - domain[0]) / 2}"
        required
        autofocus
        min="${domain[0]}"
        max="${domain[1]}"
        step="any"
      ><br>`;

    const popup = this.makePopup(t);

    this.onButton(popup, {
      cancel: () => undefined,
      reset: () => undefined,
      submit: () => {
        const newValue = +(<HTMLInputElement>popup.querySelector('input[type="number"]')).value;
        this.column.setStratifyThresholds([newValue]);
        this.column.groupByMe();
        return true;
      }
    });
  }
}
