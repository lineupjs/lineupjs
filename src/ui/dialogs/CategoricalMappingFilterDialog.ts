import { round } from '../../internal';
import type { OrdinalColumn, ICategoricalFilter } from '../../model';
import { isCategoryIncluded } from '../../model/internalCategorical';
import { filterMissingMarkup, findFilterMissing } from '../missing';
import ADialog, { IDialogContext } from './ADialog';
import { forEach } from './utils';
import { cssClass } from '../../styles';

/** @internal */
export default class CategoricalMappingFilterDialog extends ADialog {
  private readonly before: ICategoricalFilter;

  constructor(private readonly column: OrdinalColumn, dialog: IDialogContext) {
    super(dialog, {
      livePreview: 'filter',
    });
    this.before = this.column.getFilter() || {
      filter: this.column.categories.map((d) => d.name),
      filterMissing: false,
    };
  }

  protected build(node: HTMLElement) {
    const joint = this.column.categories.map((d) =>
      Object.assign(
        {
          range: round(d.value * 100, 2),
        },
        d
      )
    );
    joint.sort((a, b) => a.label.localeCompare(b.label));

    node.insertAdjacentHTML(
      'beforeend',
      `<div class="${cssClass('dialog-table')}">
        <label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')}">
          <input type="checkbox" checked>
          <span>
            <div>Un/Select All</div>
          </span>
        </label>
        ${joint
          .map(
            (cat) => `
          <label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')}">
            <input data-cat="${cat.name}" type="checkbox"${isCategoryIncluded(this.before, cat) ? 'checked' : ''}>
            <span>
              <input type="number" value="${cat.range}" min="0" max="100" size="5">
              <div class="${cssClass('dialog-filter-color-bar')}">
                <span style="background-color: ${cat.color}; width: ${cat.range}%"></span>
              </div>
              <div>${cat.label}</div>
            </span>
          </label>`
          )
          .join('')}
    </div>`
    );
    // TODO sanitize
    // selectAll
    const selectAll = this.findInput('input[type=checkbox]:not([data-cat])');
    selectAll.onchange = () => {
      forEach(node, '[data-cat]', (n: HTMLInputElement) => (n.checked = selectAll.checked));
    };
    this.forEach('input[type=number]', (d: HTMLInputElement) => {
      d.oninput = () => {
        (d.nextElementSibling!.firstElementChild as HTMLElement).style.width = `${d.value}%`;
      };
    });
    node.insertAdjacentHTML('beforeend', filterMissingMarkup(this.before.filterMissing));

    this.enableLivePreviews('input[type=checkbox], input[type=number]');
  }

  private updateFilter(filter: string[] | null | string | RegExp, filterMissing: boolean) {
    const noFilter = filter == null && filterMissing === false;
    this.column.setFilter(noFilter ? null : { filter: filter!, filterMissing });
  }

  protected cancel() {
    this.updateFilter(this.before.filter, this.before.filterMissing);
  }

  protected reset() {
    this.forEach('[data-cat]', (n: HTMLInputElement) => {
      n.checked = false;
      (n.nextElementSibling! as HTMLInputElement).value = '50';
    });
  }

  protected submit() {
    const items = this.forEach('input[data-cat]', (n: HTMLInputElement) => ({
      checked: n.checked,
      cat: n.dataset.cat!,
      range: (n.nextElementSibling as HTMLInputElement)!.valueAsNumber,
    }));
    let f: string[] | null = items.filter((d) => d.checked).map((d) => d.cat);
    if (f.length === this.column.categories.length) {
      // all checked = no filter
      f = null;
    }
    const filterMissing = findFilterMissing(this.node).checked;
    this.updateFilter(f, filterMissing);
    this.column.setMapping(items.map((d) => d.range / 100));
    return true;
  }
}
