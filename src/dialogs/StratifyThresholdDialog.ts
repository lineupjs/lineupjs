import Column from '../model/Column';
import ADialog from './ADialog';
import NumberColumn from '../model/NumberColumn';

export default class StratifyThresholdDialog extends ADialog {

  /**
   * opens a dialog for editing the link of a column
   * @param column the column to rename
   * @param $header the visual header element of this column
   * @param idPrefix dom id prefix
   */
  constructor(private readonly column: NumberColumn, $header: d3.Selection<Column>, private readonly idPrefix: string) {
    super($header, 'Stratify By Threshold');
  }

  openDialog() {
    const domain = this.column.getOriginalMapping().domain;
    const bak = this.column.getStratifyTresholds();

    const t = `<input
        type="number"
        size="15"
        value="${bak.length > 0 ? bak[0] : (domain[1] - domain[0])/2}"
        required="required"
        autofocus="autofocus"
        min="${domain[0]}"
        max="${domain[1]}"
        step="any"
      ><br>`;

    const popup = this.makePopup(t);

    popup.select('.ok').on('click', () => {
      const newValue = +popup.select('input[type="number"]').property('value');
      this.column.setStratifyThresholds([newValue]);
      this.column.groupByMe();
      popup.remove();
    });

    popup.select('.cancel').on('click', function () {
      popup.remove();
    });
  }
}
