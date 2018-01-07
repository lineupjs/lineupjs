import {round} from '../../internal';
import OrdinalColumn from '../../model/OrdinalColumn';
import {ICategoricalFilter, isCategoryIncluded} from '../../model/ICategoricalColumn';
import {filterMissingMarkup} from '../missing';
import ADialog from './ADialog';

/** @internal */
export default class CategoricalMappingFilterDialog extends ADialog {

  private readonly before: ICategoricalFilter;

  constructor(private readonly column: OrdinalColumn, attachment: HTMLElement) {
    super(attachment, {
      fullDialog: true
    });
    this.before = this.column.getFilter() || {filter: this.column.categories.map((d) => d.name), filterMissing: false};
  }

  protected build(node: HTMLElement) {
    node.classList.add('lu-filter-table');
    const joint = this.column.categories.map((d) => Object.assign({
      range: round(d.value*100,2)
    }));
    joint.sort((a, b) => a.label.localeCompare(b.label));

    node.insertAdjacentHTML('beforeend', `<div>
        ${joint.map(({name, color, label, range}) => `<label><input data-cat="${name}" type="checkbox"${isCategoryIncluded(this.before, name) ? 'checked' : ''}>
        <input type="number" value="${range}" min="0" max="100" size="5"><div><div style="background-color: ${color}; width: ${range}%"></div></div><div>${label}</div></label>`).join('')}
        <label><input type="checkbox" checked><div>Unselect All</div></label>
    </div>`);
    // selectAll
    this.findInput('input[type=checkbox]:not([data-cat])').onchange = function (this: HTMLInputElement) {
      Array.from(node.querySelectorAll('[data-cat]')).forEach((n: HTMLInputElement) => n.checked = this.checked);
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
    this.attachment.classList.toggle('lu-filtered', !noFilter);
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
    const filterMissing = this.findInput('input[type="checkbox"].lu_filter_missing').checked;
    this.updateFilter(f, filterMissing);
    this.column.setMapping(items.map((d) => d.range / 100));
    return true;
  }
}
