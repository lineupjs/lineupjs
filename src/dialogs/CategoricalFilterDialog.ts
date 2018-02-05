import CategoricalColumn from '../model/CategoricalColumn';
import AFilterDialog, {filterMissingMarkup} from './AFilterDialog';
import {sortByProperty} from './ADialog';

export default class CategoricalFilterDialog extends AFilterDialog<CategoricalColumn> {

  /**
   * opens a dialog for filtering a categorical column
   * @param column the column to rename
   * @param header the visual header element of this column
   * @param title optional title
   */
  constructor(column: CategoricalColumn, header: HTMLElement, title: string = 'Filter') {
    super(column, header, title);
  }

  openDialog() {
    const bakOri = this.column.getFilter() || {filter: this.column.categories.slice(), filterMissing: false};
    const bak = <string[]>bakOri.filter || this.column.categories.slice();
    const bakMissing = bakOri.filterMissing;
    const popup = this.makePopup(`<div class="selectionTable"><table><thead><th class="selectAll"></th><th>Select All</th></thead><tbody></tbody></table></div>
        ${filterMissingMarkup(bakMissing)}<br>`);

    // list all data rows !
    const colors = this.column.categoryColors,
      labels = this.column.categoryLabels;
    const trData = this.column.categories.map(function (d, i) {
      return {cat: d, label: labels[i]!, isChecked: bak.indexOf(d) >= 0, color: colors[i]!};
    }).sort(sortByProperty('label'));

    const base = popup.querySelector('table')!;
    const rows = trData.map((d) => {
      base.insertAdjacentHTML('beforeend', `<tr>
          <td class="checkmark"></td>
          <td class="datalabel">${d.label}</td>
         </tr>`);
      const click = () => {
        d.isChecked = !d.isChecked;
        redraw();
      };
      const row = <HTMLElement>base.lastElementChild!;
      row.querySelector('td.checkmark')!.addEventListener('click', click);
      row.querySelector('td.datalabel')!.addEventListener('click', click);
      return row;
    });

    function redraw() {
      rows.forEach((row, i) => {
        const d = trData[i];
        (<HTMLElement>row.querySelector('.checkmark')).innerHTML = `<i class="fa fa-${(d.isChecked) ? 'check-' : ''}square-o"></i>`;
        (<HTMLElement>row.querySelector('.datalabel')).style.opacity = d.isChecked ? '1.0' : '.8';
      });
    }

    redraw();

    let isCheckedAll = true;

    if (!trData.some((d) => d.isChecked)) {
      isCheckedAll = false;
    }

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
      cancel: () => updateData(bak, bakMissing),
      reset: () => {
        trData.forEach((d) => d.isChecked = true);
        redraw();
        updateData(null, false);
      },
      submit: () => {
        let f: string[] | null = trData.filter((d) => d.isChecked).map((d) => d.cat);
        if (f.length === trData.length) { // all checked = no filter
          f = null;
        }
        const filterMissing = (<HTMLInputElement>popup.querySelector('input[type="checkbox"].lu_filter_missing')!).checked;
        updateData(f, filterMissing);
        return true;
      }
    });
  }
}
