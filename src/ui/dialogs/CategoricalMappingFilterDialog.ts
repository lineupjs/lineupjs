import CategoricalNumberColumn from '../../model/CategoricalNumberColumn';
import {ICategoricalFilter, isIncluded} from '../../model/ICategoricalColumn';
import {filterMissingMarkup} from '../missing';
import ADialog from './ADialog';
import {filtered} from './CategoricalFilterDialog';


export default class CategoricalMappingFilterDialog extends ADialog {

  private readonly before: ICategoricalFilter;

  constructor(private readonly column: CategoricalNumberColumn, attachment: HTMLElement) {
    super(attachment, {
      fullDialog: true
    });
    this.before = this.column.getFilter() || {filter: this.column.categories.slice(), filterMissing: false};
  }

  protected build(node: HTMLElement) {
    node.classList.add('lu-filter-table');
    const range = this.column.getScale().range;
    const colors = this.column.categoryColors;
    const labels = this.column.categoryLabels;

    const joint = this.column.categories.map((d, i) => ({
      cat: d,
      color: colors[i]!,
      label: labels[i]!,
      range: range[i]!
    }));
    joint.sort((a, b) => a.label.localeCompare(b.label));

    node.insertAdjacentHTML('beforeend', `<div>
        ${joint.map(({cat, color, label, range}) => `<div${!isIncluded(this.before, cat) ? 'data-no="no"' : ''} data-cat="${cat}">
        <input type="number" value="${range}" min="0" max="100" size="5"><span style="background-color: ${color}; width: ${range}%"></span>${label}</div>`)}
        <div>Unselect All</div>
    </div>`);
    // selectAll
    (<HTMLElement>node.lastElementChild!.lastElementChild!).onclick = function (this: HTMLElement) {
      const no = this.dataset.no !== 'no';
      filtered(this, no);
      Array.from(node.querySelectorAll('[data-cat]')).forEach((n: HTMLElement) => filtered(n, no));
    };
    this.forEach('input[type=number]', (d: HTMLInputElement) => {
      d.oninput = () => {
        (<HTMLElement>d.nextElementSibling).style.width = `${d.value}px`;
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
    this.forEach('[data-cat]', (n: HTMLElement) => {
      filtered(n, false);
      n.querySelector('input')!.value = '50';
    });
    this.updateFilter(null, false);
    this.column.setMapping(this.column.categories.map(() => 1));
  }

  submit() {
    const items = this.forEach('[data-cat]', (n: HTMLElement) => ({
      checked: n.dataset.no !== 'no',
      cat: n.dataset.cat!,
      range: parseFloat(n.querySelector('input')!.value)
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
