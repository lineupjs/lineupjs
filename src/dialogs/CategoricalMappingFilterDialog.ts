import AFilterDialog, {filterMissingMarkup} from './AFilterDialog';
import CategoricalNumberColumn from '../model/CategoricalNumberColumn';
import {scale as d3scale} from 'd3';
import {sortByProperty} from './ADialog';


export default class CategoricalMappingFilterDialog extends AFilterDialog<CategoricalNumberColumn> {

  /**
   * opens the mapping editor for a given CategoricalNumberColumn, i.e. to map categories to numbers
   * @param column the column to rename
   * @param header the visual header element of this column
   * @param title mapping title
   */
  constructor(column: CategoricalNumberColumn, header: HTMLElement, title = 'Edit Categorical Mapping') {
    super(column, header, title);
  }

  protected build():HTMLElement {
    const bakOri = this.column.getFilter() || {filter: [], filterMissing: false};
    const bak = <string[]>bakOri.filter;
    const bakMissing = bakOri.filterMissing;


    const scale = d3scale.linear().domain([0, 100]).range([0, 120]);

    const popup = this.makePopup(`<div class="selectionTable"><table><thead><th class="selectAll"></th><th colspan="2">Scale</th><th>Category</th></thead><tbody></tbody></table></div>
        ${filterMissingMarkup(bakMissing)}<br>`);

    const range = this.column.getScale().range,
      colors = this.column.categoryColors,
      labels = this.column.categoryLabels;

    const trData = this.column.categories.map((d, i) => {
      return {
        cat: d,
        label: labels[i]!,
        isChecked: bak.length === 0 || bak.indexOf(d) >= 0,
        range: range[i]! * 100,
        color: colors[i]!
      };
    }).sort(sortByProperty('label'));

    const base = popup.querySelector('table')!;
    const rows = trData.map((d) => {
      base.insertAdjacentHTML('beforeend', `<tr>
          <td class="checkmark"></td>
          <td><input type="number" value="${d.range}" min="0" max="100" size="5"></td>
          <td><div class="bar" style="background-color: ${d.color}"></div></td>
          <td class="datalabel">${d.label}</td>
         </tr>`);
      const row = <HTMLElement>base.lastElementChild!;
      row.querySelector('td.checkmark')!.addEventListener('click', () => {
        d.isChecked = !d.isChecked;
        redraw();
      });
      row.querySelector('input')!.addEventListener('input', function(this: HTMLInputElement) {
        d.range = parseFloat(this.value);
        redraw();
      });
      return row;
    });

    function redraw() {
      rows.forEach((row, i) => {
        const d = trData[i];
        (<HTMLElement>row.querySelector('.checkmark')).innerHTML = `<i class="fa fa-${(d.isChecked) ? 'check-' : ''}square-o"></i>`;
        (<HTMLElement>row.querySelector('.bar')).style.width = `${scale(d.range)}px`;
        (<HTMLElement>row.querySelector('.datalabel')).style.opacity = d.isChecked ? '1.0' : '.8';
      });
    }

    redraw();

    let isCheckedAll = true;

    function redrawSelectAll() {
      (<HTMLElement>popup.querySelector('.selectAll')).innerHTML = `<i class="fa fa-${(isCheckedAll) ? 'check-' : ''}square-o"></i>`;
    }
    popup.querySelector('thead')!.addEventListener('click', () => {
      isCheckedAll = !isCheckedAll;
      trData.forEach((row) => row.isChecked = isCheckedAll);
      redraw();
      redrawSelectAll();
    });

    redrawSelectAll();

    const updateData = (filter: string[] | null, filterMissing: boolean) => {
      const noFilter = filter === null && filterMissing === false;
      this.markFiltered(!noFilter);
      this.column.setFilter(noFilter ? null : {filter: filter!, filterMissing});
    };

    this.onButton(popup, {
      cancel: () => {
        updateData(bak, bakMissing);
        this.column.setMapping(range);
      },
      reset: () => {
        trData.forEach((d) => {
          d.isChecked = true;
          d.range = 50;
        });
        redraw();
        updateData(null, false);
        this.column.setMapping(trData.map(() => 1));
      },
      submit: () => {
        let f: string[] | null = trData.filter((d) => d.isChecked).map((d) => d.cat);
        if (f.length === trData.length) {
          f = null;
        }
        const filterMissing = (<HTMLInputElement>popup.querySelector('input[type="checkbox"].lu_filter_missing')!).checked;
        updateData(f, filterMissing);
        this.column.setMapping(trData.map((d) => d.range / 100));
        return true;
      }
    });

    return popup;
  }
}
