import {round} from '../../internal';
import OrdinalColumn from '../../model/OrdinalColumn';
import {ICategoricalFilter, isCategoryIncluded} from '../../model/ICategoricalColumn';
import {filterMissingMarkup, findFilterMissing} from '../missing';
import ADialog, {IDialogContext} from './ADialog';
import {updateFilterState, uniqueId, forEach} from './utils';

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
    node.classList.add('lu-filter-table');
    const joint = this.column.categories.map((d) => Object.assign({
      range: round(d.value * 100, 2)
    }));
    joint.sort((a, b) => a.label.localeCompare(b.label));

    const id = uniqueId(this.dialog.idPrefix);
    node.insertAdjacentHTML('beforeend', `<div>
        <div class="lu-checkbox"><input id="${id}" type="checkbox" checked><label for="${id}"><div>Un/Select All</div></label></div>
        ${joint.map(({name, color, label, range}) => `<input id="${id}${name}" data-cat="${name}" type="checkbox"${isCategoryIncluded(this.before, name) ? 'checked' : ''}>
        <div class="lu-checkbox"><input type="number" value="${range}" min="0" max="100" size="5"><label for="${id}${name}"><div><div style="background-color: ${color}; width: ${range}%"></div></div><div>${label}</div></label></div>`).join('')}
    </div>`);
    // selectAll
    this.findInput('input[type=checkbox]:not([data-cat])').onchange = function (this: HTMLElement) {
      const input = <HTMLInputElement>this;
      forEach(node, '[data-cat]', (n: HTMLInputElement) => n.checked = input.checked);
    };
    this.forEach('input[type=number]', (d: HTMLInputElement) => {
      d.oninput = () => {
        (<HTMLElement>d.nextElementSibling!.firstElementChild).style.width = `${d.value}%`;
      };
    });
    node.insertAdjacentHTML('beforeend', filterMissingMarkup(this.before.filterMissing, this.dialog.idPrefix));
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
      range: parseFloat((<HTMLInputElement>n.nextElementSibling)!.value)
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
