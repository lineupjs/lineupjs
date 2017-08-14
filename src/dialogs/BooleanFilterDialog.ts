import BooleanColumn from '../model/BooleanColumn';
import Column from '../model/Column';
import AFilterDialog from './AFilterDialog';
import {Selection} from 'd3';

export default class BooleanFilterDialog extends AFilterDialog<BooleanColumn> {

  /**
   * opens a dialog for filtering a boolean column
   * @param column the column to filter
   * @param $header the visual header element of this column
   * @param title optional title
   */
  constructor(column: BooleanColumn, $header: Selection<BooleanColumn>, title: string = 'Filter') {
    super(column, $header, title);
  }

  openDialog() {
    const bak = this.column.getFilter();

    const $popup = this.makePopup(`<label><input type="radio" name="boolean_check" value="null" ${bak === null ? 'checked="checked"' : ''}>No Filter</label><br>
     <label><input type="radio" name="boolean_check" value="true" ${bak === true ? 'checked="checked"' : ''}>True</label><br>
     <label><input type="radio" name="boolean_check" value="false" ${bak === false ? 'checked="checked"' : ''}>False</label>
    <br>`);

    const updateData = (filter: boolean) => {
      this.markFiltered((filter !== null));
      this.column.setFilter(filter);
    };

    function updateImpl() {
      //get value
      const isTrue = $popup.select('input[type="radio"][value="true"]').property('checked');
      const isFalse = $popup.select('input[type="radio"][value="false"]').property('checked');
      updateData(isTrue ? true : (isFalse ? false : null));
    }

    $popup.selectAll('input[type="radio"]').on('change', updateImpl);

    $popup.select('.cancel').on('click', function () {
      $popup.remove();
      updateData(bak);
    });
    $popup.select('.reset').on('click', function () {
      const v = bak === null ? 'null' : String(bak);
      $popup.selectAll('input[type="radio"]').property('checked', function () {
        return this.value === v;
      });
      updateData(null);
    });
    $popup.select('.ok').on('click', function () {
      updateImpl();
      $popup.remove();
    });
  }
}
