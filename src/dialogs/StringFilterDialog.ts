import StringColumn from '../model/StringColumn';
import AFilterDialog, {filterMissingMarkup} from './AFilterDialog';
import {Selection} from 'd3';


export default class StringFilterDialog extends AFilterDialog<StringColumn> {
  /**
   * opens a dialog for filtering a string column
   * @param column the column to filter
   * @param $header the visual header element of this column
   * @param title optional title
   */
  constructor(column: StringColumn, $header: Selection<StringColumn>, title: string = 'Filter') {
    super(column, $header, title);
  }

  openDialog() {
    let bak = this.column.getFilter() || '';
    const bakMissing = bak === StringColumn.FILTER_MISSING;
    if (bakMissing) {
      bak = '';
    }

    const $popup = this.makePopup(`<input type="text" placeholder="containing..." autofocus value="${(bak instanceof RegExp) ? bak.source : bak}" style="width: 100%">
    <br><label><input type="checkbox" ${(bak instanceof RegExp) ? 'checked="checked"' : ''}>RegExp</label>
    <br>${filterMissingMarkup(bakMissing)}
    <br>`);

    const updateData = (filter: string|RegExp) => {
      this.markFiltered((filter && filter !== ''));
      this.column.setFilter(filter);
    };

    function updateImpl(force: boolean) {
      //get value
      let search: any = $popup.select('input[type="text"]').property('value');
      const filterMissing = $popup.select('input[type="checkbox"].lu_filter_missing').property('checked');

      if (filterMissing && search === '') {
        search = StringColumn.FILTER_MISSING;
      }
      if (search === '') { //reset
        updateData(search);
        return;
      }
      if (search.length >= 3 || force) {
        const isRegex = $popup.select('input[type="checkbox"]:first-of-type').property('checked');
        if (isRegex && search !== StringColumn.FILTER_MISSING) {
          search = new RegExp(search);
        }
        updateData(search);
      }

    }

    $popup.selectAll('input[type="checkbox"]').on('change', updateImpl);
    $popup.select('input[type="text"]').on('input', updateImpl);

    $popup.select('.cancel').on('click', function () {
      $popup.select('input[type="text"]').property('value', bak || '');
      $popup.select('input[type="checkbox"]:first-of-type').property('checked', bak instanceof RegExp ? 'checked' : null);
      $popup.select('input[type="checkbox"].lu_filter_missing').property('checked', bakMissing ? 'checked' : null);
      updateData(bak);
      $popup.remove();
    });
    $popup.select('.reset').on('click', function () {
      $popup.select('input[type="text"]').property('value', '');
      $popup.selectAll('input[type="checkbox"]').property('checked', null);
      updateData(null);
    });
    $popup.select('.ok').on('click', function () {
      updateImpl(true);
      $popup.remove();
    });
  }
}
