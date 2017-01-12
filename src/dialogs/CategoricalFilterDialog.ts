import CategoricalColumn from '../model/CategoricalColumn';
import Column from '../model/Column';
import AFilter from './AFilter';
import {Selection} from 'd3';

export default class CategoricalFilterDialog extends AFilter {

  /**
   * opens a dialog for filtering a categorical column
   * @param column the column to rename
   * @param $header the visual header element of this column
   * @param title optional title
   */
  constructor(private readonly column: CategoricalColumn, $header: Selection<Column>, title: string = 'Filter') {
    super($header, title);
  }

  openDialog() {
    const bak = this.column.getFilter() || [];
    const popup = this.makePopup('<div class="selectionTable"><table><thead><th class="selectAll"></th><th>Category</th></thead><tbody></tbody></table></div>');

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

    const updateData = (filter) => {
      this.markFiltered(filter && filter.length > 0 && filter.length < trData.length);
      this.column.setFilter(filter);
    }

    popup.select('.cancel').on('click', function () {
      updateData(bak);
      popup.remove();
    });
    popup.select('.reset').on('click', function () {
      trData.forEach((d) => d.isChecked = true);
      redraw();
      updateData(null);
    });
    popup.select('.ok').on('click', function () {
      let f = trData.filter((d) => d.isChecked).map((d) => d.cat);
      if (f.length === trData.length) {
        f = [];
      }
      updateData(f);
      popup.remove();
    });
  }
}
