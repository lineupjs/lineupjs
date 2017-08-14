import CategoricalColumn from '../model/CategoricalColumn';
import AFilterDialog, {filterMissingMarkup} from './AFilterDialog';
import {Selection} from 'd3';

export default class CategoricalFilterDialog extends AFilterDialog<CategoricalColumn> {

  /**
   * opens a dialog for filtering a categorical column
   * @param column the column to rename
   * @param $header the visual header element of this column
   * @param title optional title
   */
  constructor(column: CategoricalColumn, $header: Selection<CategoricalColumn>, title: string = 'Filter') {
    super(column, $header, title);
  }

  openDialog() {
    const bakOri = this.column.getFilter() || {filter: [], filterMissing: false};
    const bak = <string[]>bakOri.filter || [];
    const bakMissing = bakOri.filterMissing;
    const popup = this.makePopup(`<div class="selectionTable"><table><thead><th class="selectAll"></th><th>Category</th></thead><tbody></tbody></table></div>
        ${filterMissingMarkup(bakMissing)}<br>`);

    // list all data rows !
    const colors = this.column.categoryColors,
      labels = this.column.categoryLabels;
    const trData = this.column.categories.map(function (d, i) {
      return {cat: d, label: labels[i], isChecked: bak.length === 0 || bak.indexOf(d) >= 0, color: colors[i]};
    }).sort(this.sortByName('label'));

    const $rows = popup.select('tbody').selectAll('tr').data(trData);
    const $rowsEnter = $rows.enter().append('tr');
    $rowsEnter.append('td').attr('class', 'checkmark');
    $rowsEnter.append('td').attr('class', 'datalabel').text((d) => d.label);
    $rowsEnter.on('click', (d) => {
      d.isChecked = !d.isChecked;
      redraw();
    });

    function redraw() {
      $rows.select('.checkmark').html((d) => '<i class="fa fa-' + ((d.isChecked) ? 'check-' : '') + 'square-o"></i>');
      $rows.select('.datalabel').style('opacity', (d) => d.isChecked ? '1.0' : '.8');
    }

    redraw();

    let isCheckedAll = true;

    function redrawSelectAll() {
      popup.select('.selectAll').html((d) => '<i class="fa fa-' + ((isCheckedAll) ? 'check-' : '') + 'square-o"></i>');
      popup.select('thead').on('click', () => {
        isCheckedAll = !isCheckedAll;
        trData.forEach((row) => row.isChecked = isCheckedAll);
        redraw();
        redrawSelectAll();
      });
    }

    redrawSelectAll();

    const updateData = (filter: string[], filterMissing: boolean) => {
      const noFilter = filter === null && filterMissing === false;
      this.markFiltered(!noFilter);
      this.column.setFilter(noFilter ? null : {filter, filterMissing});
    };

    popup.select('.cancel').on('click', function () {
      popup.remove();
      updateData(bak, bakMissing);
    });
    popup.select('.reset').on('click', function () {
      trData.forEach((d) => d.isChecked = true);
      redraw();
      updateData(null, null);
    });
    popup.select('.ok').on('click', function () {
      let f = trData.filter((d) => d.isChecked).map((d) => d.cat);
      if (f.length === trData.length) { // all checked = no filter
        f = null;
      }
      const filterMissing = popup.select('input[type="checkbox"].lu_filter_missing').property('checked');
      updateData(f, filterMissing);
      popup.remove();
    });
  }
}
