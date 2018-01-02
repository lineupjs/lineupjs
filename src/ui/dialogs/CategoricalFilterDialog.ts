import CategoricalColumn from '../../model/CategoricalColumn';
import {ICategoricalFilter, isIncluded} from '../../model/ICategoricalColumn';
import {filterMissingMarkup} from '../missing';
import {default as ADialog} from './ADialog';

export default class CategoricalFilterDialog extends ADialog {

  private readonly before: ICategoricalFilter;

  constructor(private readonly column: CategoricalColumn, attachment: HTMLElement) {
    super(attachment, {
      fullDialog: true
    });
    this.before = this.column.getFilter() || {filter: this.column.categories.slice(), filterMissing: false};
  }

  protected build(node: HTMLElement) {
    node.classList.add('lu-filter-table');
    const colors = this.column.categoryColors;
    const labels = this.column.categoryLabels;

    const joint = this.column.categories.map((d, i) => ({cat: d, color: colors[i]!, label: labels[i]!}));
    joint.sort((a, b) => a.label.localeCompare(b.label));

    node.insertAdjacentHTML('beforeend', `<div>
        ${joint.map(({cat, color, label}) => `<div${!isIncluded(this.before, cat) ? 'data-no="no"': ''} data-cat="${cat}"><span style="background-color: ${color}"></span>${label}</div>`)}
        <div>Unselect All</div>
    </div>`);
    // selectAll
    (<HTMLElement>this.node.lastElementChild!.lastElementChild!).onclick = function(this: HTMLElement) {
      const no = this.dataset.no !== 'no';
      filtered(this, no);
      Array.from(node.querySelectorAll('[data-cat]')).forEach( (n: HTMLElement) => filtered(n, no));
    };
    node.insertAdjacentHTML('beforeend', filterMissingMarkup(this.before.filterMissing));
  }

  private updateFilter(filter: string[] | null, filterMissing: boolean) {
    const noFilter = filter == null && filterMissing === false;
    this.attachment.classList.toggle('lu-filtered', !noFilter);
    this.column.setFilter(noFilter ? null : {filter: filter!, filterMissing});
  }

  reset() {
    this.forEach('[data-cat]', (n: HTMLElement) => filtered(n, false));
    this.updateFilter(null, false);
  }

  submit() {
    let f: string[]|null = this.forEach('[data-cat]', (n: HTMLElement) => ({checked: n.dataset.no !== 'no', cat: n.dataset.cat!})).filter((d) => d.checked).map((d) => d.cat);
    if (f.length === this.column.categories.length) { // all checked = no filter
      f = null;
    }
    const filterMissing = this.findInput('input[type="checkbox"].lu_filter_missing').checked;
    this.updateFilter(f, filterMissing);
    return true;
  }
}

export function filtered(n: HTMLElement, filtered: boolean) {
  if (filtered) {
    delete n.dataset.no;
  } else {
    n.dataset.no = 'no';
  }
}
