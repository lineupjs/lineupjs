import CategoricalColumn from '../../model/CategoricalColumn';
import {ICategoricalFilter, isCategoryIncluded} from '../../model/ICategoricalColumn';
import SetColumn from '../../model/SetColumn';
import {filterMissingMarkup, findFilterMissing} from '../missing';
import ADialog, {IDialogContext} from './ADialog';
import {updateFilterState, randomId, forEach} from './utils';

/** @internal */
export default class CategoricalFilterDialog extends ADialog {

  private readonly before: ICategoricalFilter;

  constructor(private readonly column: CategoricalColumn | SetColumn, dialog: IDialogContext) {
    super(dialog, {
      fullDialog: true
    });
    this.before = this.column.getFilter() || {filter: this.column.categories.map((d) => d.name), filterMissing: false};
  }

  protected build(node: HTMLElement) {
    node.classList.add('lu-filter-table');

    const id = randomId(this.dialog.idPrefix);

    node.insertAdjacentHTML('beforeend', `<div>
        <div class="lu-checkbox"><input id="${id}" type="checkbox" checked><label for="${id}"><span></span><div>Un/Select All</div></label></div>
        ${this.column.categories.map((c) => `<div class="lu-checkbox"><input for="${id}${c.name}" data-cat="${c.name}" type="checkbox"${isCategoryIncluded(this.before, c) ? 'checked' : ''}><label for="${id}${c.name}"><span style="background-color: ${c.color}"></span><div>${c.label}</div></label></div>`).join('')}
    </div>`);
    // selectAll
    this.findInput('input:not([data-cat])').onchange = function (this: HTMLElement) {
      const input = <HTMLInputElement>this;
      forEach(node, 'input[data-cat]', (n: HTMLInputElement) => n.checked = input.checked);
    };
    node.insertAdjacentHTML('beforeend', filterMissingMarkup(this.before.filterMissing, this.dialog.idPrefix));
  }

  private updateFilter(filter: string[] | null, filterMissing: boolean) {
    const noFilter = filter == null && filterMissing === false;
    updateFilterState(this.attachment, this.column, !noFilter);
    this.column.setFilter(noFilter ? null : {filter: filter!, filterMissing});
  }

  reset() {
    this.forEach('input[data-cat]', (n: HTMLInputElement) => n.checked = true);
    this.updateFilter(null, false);
  }

  submit() {
    let f: string[] | null = this.forEach('input[data-cat]', (n: HTMLInputElement) => n.checked ? n.dataset.cat! : '').filter(Boolean);
    if (f.length === this.column.categories.length) { // all checked = no filter
      f = null;
    }
    const filterMissing = findFilterMissing(this.node).checked;
    this.updateFilter(f, filterMissing);
    return true;
  }
}
