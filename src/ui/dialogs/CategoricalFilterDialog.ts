import {SetColumn, CategoricalColumn, ICategoricalFilter} from '../../model';
import {filterMissingMarkup, findFilterMissing} from '../missing';
import ADialog, {IDialogContext} from './ADialog';
import {updateFilterState, forEach} from './utils';
import {cssClass} from '../../styles';
import {isCategoryIncluded} from '../../model/internalCategorical';

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
    node.insertAdjacentHTML('beforeend', `<div class="${cssClass('dialog-table')}">
        <label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')}">
          <input type="checkbox" checked>
          <span>
            <span class="${cssClass('dialog-filter-table-color')}"></span>
            <div>Un/Select All</div>
          </span>
        </label>
        ${this.column.categories.map((c) => `<label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')}">
          <input data-cat="${c.name}" type="checkbox"${isCategoryIncluded(this.before, c) ? 'checked' : ''}>
          <span>
            <span class="${cssClass('dialog-filter-table-color')}" style="background-color: ${c.color}"></span>
            <div>${c.label}</div>
          </span>
        </label>`).join('')}
    </div>`);
    // selectAll
    const selectAll = this.findInput('input:not([data-cat])');
    selectAll.onchange =  () => {
      forEach(node, 'input[data-cat]', (n: HTMLInputElement) => n.checked = selectAll.checked);
    };
    node.insertAdjacentHTML('beforeend', filterMissingMarkup(this.before.filterMissing));
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
