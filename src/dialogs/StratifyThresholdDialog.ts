import ADialog, {IMaskRect} from './ADialog';
import NumberColumn from '../model/NumberColumn';

export default class StratifyThresholdDialog extends ADialog {

  /**
   * opens a dialog for editing the link of a column
   * @param column the column to rename
   * @param header the visual header element of this column
   * @param backdropMaskRect
   */
  constructor(private readonly column: NumberColumn, header: HTMLElement, public backdropMaskRect:() => IMaskRect) {
    super(header, 'Stratify by Threshold');
  }

  protected build():HTMLElement {
    if (this.column.isGroupedBy() >= 0) {
      // disable grouping
      this.column.groupByMe();
      return this.attachment.ownerDocument.createElement('div');
    }
    const domain = this.column.getOriginalMapping().domain;
    const bak = this.column.getStratifyThresholds();

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

    return popup;
  }
}
