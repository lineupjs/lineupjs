import CategoricalColumn from '../../model/CategoricalColumn';
import {ICategoricalFilter, isIncluded} from '../../model/ICategoricalColumn';
import SetColumn from '../../model/SetColumn';
import {filterMissingMarkup} from '../missing';
import {default as ADialog} from './ADialog';

/** @internal */
export default class CategoricalFilterDialog extends ADialog {

  private readonly before: ICategoricalFilter;

  constructor(private readonly column: CategoricalColumn|SetColumn, attachment: HTMLElement) {
    super(attachment, {
      fullDialog: true
    });
    this.before = this.column.getFilter() || {filter: this.column.categories.map((d) => d.name), filterMissing: false};
  }

  protected build(node: HTMLElement) {
    node.classList.add('lu-filter-table');

    node.insertAdjacentHTML('beforeend', `<div>
        ${this.column.categories.map((c) => `<label><input data-cat="${c.name}" type="checkbox"${isIncluded(this.before, c) ? 'checked': ''}><span style="background-color: ${c.color}"></span><div>${c.label}</div></label>`).join('')}
        <label><input type="checkbox" checked><span></span><div>Unselect All</div></label>
    </div>`);
    // selectAll
    this.findInput('input:not([data-cat])').onchange = function(this: HTMLInputElement) {
      Array.from(node.querySelectorAll('input[data-cat]')).forEach( (n: HTMLInputElement) => n.checked = this.checked);
    };
    node.insertAdjacentHTML('beforeend', filterMissingMarkup(this.before.filterMissing));
  }

  private updateFilter(filter: string[] | null, filterMissing: boolean) {
    const noFilter = filter == null && filterMissing === false;
    this.attachment.classList.toggle('lu-filtered', !noFilter);
    this.column.setFilter(noFilter ? null : {filter: filter!, filterMissing});
  }

  reset() {
    this.forEach('input[data-cat]', (n: HTMLInputElement) => n.checked = true);
    this.updateFilter(null, false);
  }

  submit() {
    let f: string[]|null = this.forEach('input[data-cat]', (n: HTMLInputElement) => n.checked ? n.dataset.cat! : '').filter(Boolean);
    if (f.length === this.column.categories.length) { // all checked = no filter
      f = null;
    }
    const filterMissing = this.findInput('input[type="checkbox"].lu_filter_missing').checked;
    this.updateFilter(f, filterMissing);
    return true;
  }
}
