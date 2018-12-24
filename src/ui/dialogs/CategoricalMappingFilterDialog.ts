import {round} from '../../internal';
import {OrdinalColumn, ICategoricalFilter} from '../../model';
import {isCategoryIncluded} from '../../model/internalCategorical';
import {filterMissingMarkup, findFilterMissing} from '../missing';
import ADialog, {IDialogContext} from './ADialog';
import {updateFilterState, forEach} from './utils';
import {cssClass} from '../../styles';

/** @internal */
export default class CategoricalMappingFilterDialog extends ADialog {

  private readonly before: ICategoricalFilter;

  constructor(private readonly column: OrdinalColumn, dialog: IDialogContext) {
    super(dialog, {
      fullDialog: true
    });
    this.before = this.column.getFilter() || {filter: this.column.categories.map((d) => d.name), filterMissing: false};
  }

  protected build(node: HTMLElement) {
    const joint = this.column.categories.map((d) => Object.assign({
      range: round(d.value * 100, 2)
    }));
    joint.sort((a, b) => a.label.localeCompare(b.label));

    node.insertAdjacentHTML('beforeend', `<div class="${cssClass('dialog-table')}">
        <label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')}">
          <input type="checkbox" checked>
          <span>
            <div>Un/Select All</div>
          </span>
        </label>
        ${joint.map(({name, color, label, range}) => `
          <label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')}">
            <input data-cat="${name}" type="checkbox"${isCategoryIncluded(this.before, name) ? 'checked' : ''}>
            <span>
              <input type="number" value="${range}" min="0" max="100" size="5">
              <div class="${cssClass('dialog-filter-color-bar')}">
                <span style="background-color: ${color}; width: ${range}%"></span>
              </div>
              <div>${label}</div>
            </span>
          </label>`).join('')}
    </div>`);
    // selectAll
    const selectAll = this.findInput('input[type=checkbox]:not([data-cat])');
    selectAll.onchange = () => {
      forEach(node, '[data-cat]', (n: HTMLInputElement) => n.checked = selectAll.checked);
    };
    this.forEach('input[type=number]', (d: HTMLInputElement) => {
      d.oninput = () => {
        (<HTMLElement>d.nextElementSibling!.firstElementChild).style.width = `${d.value}%`;
      };
    });
    node.insertAdjacentHTML('beforeend', filterMissingMarkup(this.before.filterMissing));
  }

  private updateFilter(filter: string[] | null, filterMissing: boolean) {
    const noFilter = filter == null && filterMissing === false;
    updateFilterState(this.attachment, this.column, !noFilter);
    this.column.setFilter(noFilter ? null : {filter: filter!, filterMissing});
  }

  reset() {
    this.forEach('[data-cat]', (n: HTMLInputElement) => {
      n.checked = false;
      (<HTMLInputElement>n.nextElementSibling!).value = '50';
    });
    this.updateFilter(null, false);
    this.column.setMapping(this.column.categories.map(() => 1));
  }

  submit() {
    const items = this.forEach('input[data-cat]', (n: HTMLInputElement) => ({
      checked: n.checked,
      cat: n.dataset.cat!,
      range: (<HTMLInputElement>n.nextElementSibling)!.valueAsNumber
    }));
    let f: string[] | null = items.filter((d) => d.checked).map((d) => d.cat);
    if (f.length === this.column.categories.length) { // all checked = no filter
      f = null;
    }
    const filterMissing = findFilterMissing(this.node).checked;
    this.updateFilter(f, filterMissing);
    this.column.setMapping(items.map((d) => d.range / 100));
    return true;
  }
}
