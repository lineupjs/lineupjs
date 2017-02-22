import AFilterDialog from './AFilterDialog';
import CategoricalNumberColumn from '../model/CategoricalNumberColumn';
import DataProvider from '../provider/ADataProvider';
import {scale as d3scale} from 'd3';


export default class CategoricalMappingFilterDialog extends AFilterDialog<CategoricalNumberColumn> {

  /**
   * opens the mapping editor for a given CategoricalNumberColumn, i.e. to map categories to numbers
   * @param column the column to rename
   * @param $header the visual header element of this column
   */
  constructor(column: CategoricalNumberColumn, $header: d3.Selection<CategoricalNumberColumn>, title: string = 'Edit Categorical Mapping') {
    super(column, $header, title);
  }

  openDialog() {
    const bakOri = this.column.getFilter() || {filter: [], filterMissing: false};
    const bak = <string[]>bakOri.filter;
    const bakMissing = bakOri.filterMissing;


    const scale = d3scale.linear().domain([0, 100]).range([0, 120]);

    const $popup = this.makePopup(`<div class="selectionTable"><table><thead><th class="selectAll"></th><th colspan="2">Scale</th><th>Category</th></thead><tbody></tbody></table></div>
        <label><input class="lu_filter_missing" type="checkbox" ${bakMissing ? 'checked="checked"' : ''}>Filter Missing</label><br>`);

    const range = this.column.getScale().range,
      colors = this.column.categoryColors,
      labels = this.column.categoryLabels;

    const trData = this.column.categories.map((d, i) => {
      return {
        cat: d,
        label: labels[i],
        isChecked: bak.length === 0 || bak.indexOf(d) >= 0,
        range: range[i] * 100,
        color: colors[i]
      };
    }).sort(this.sortByName('label'));

    const $rows = $popup.select('tbody').selectAll('tr').data(trData);
    const $rowsEnter = $rows.enter().append('tr');
    $rowsEnter.append('td').attr('class', 'checkmark').on('click', (d) => {
      d.isChecked = !d.isChecked;
      redraw();
    });
    $rowsEnter.append('td')
      .append('input').attr({
      type: 'number',
      value: (d) => d.range,
      min: 0,
      max: 100,
      size: 5
    }).on('input', function (d) {
      d.range = +this.value;
      redraw();
    });
    $rowsEnter.append('td').append('div').attr('class', 'bar').style('background-color', (d) => d.color);
    $rowsEnter.append('td').attr('class', 'datalabel').text((d) => d.label);

    function redraw() {
      $rows.select('.checkmark').html((d) => '<i class="fa fa-' + ((d.isChecked) ? 'check-' : '') + 'square-o"></i>');
      $rows.select('.bar').transition().style('width', (d) => scale(d.range) + 'px');
      $rows.select('.datalabel').style('opacity', (d) => d.isChecked ? '1.0' : '.8');
    }

    redraw();

    let isCheckedAll = true;

    function redrawSelectAll() {
      $popup.select('.selectAll').html((d) => '<i class="fa fa-' + ((isCheckedAll) ? 'check-' : '') + 'square-o"></i>');
      $popup.select('thead').on('click', () => {
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

    $popup.select('.cancel').on('click', () => {
      updateData(bak, bakMissing);
      this.column.setMapping(range);
      $popup.remove();
    });
    $popup.select('.reset').on('click', () => {
      trData.forEach((d) => {
        d.isChecked = true;
        d.range = 50;
      });
      redraw();
      updateData(null, null);
      this.column.setMapping(trData.map(() => 1));
    });
    $popup.select('.ok').on('click', () => {
      let f = trData.filter((d) => d.isChecked).map((d) => d.cat);
      if (f.length === trData.length) {
        f = null;
      }
      const filterMissing = $popup.select('input[type="checkbox"].lu_filter_missing').property('checked');
      updateData(f, filterMissing);
      this.column.setMapping(trData.map((d) => d.range / 100));
      $popup.remove();
    });
  }
}
