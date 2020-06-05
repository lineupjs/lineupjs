import {SetColumn, CategoricalColumn, ICategoricalFilter, ISetCategoricalFilter} from '../../model';
import {filterMissingMarkup, findFilterMissing} from '../missing';
import ADialog, {IDialogContext} from './ADialog';
import {forEach} from './utils';
import {cssClass} from '../../styles';
import {isCategoryIncluded} from '../../model/internalCategorical';

/** @internal */
export default class CategoricalFilterDialog extends ADialog {

  private readonly before: ICategoricalFilter;

  constructor(private readonly column: CategoricalColumn | SetColumn, dialog: IDialogContext) {
    super(dialog, {
      livePreview: 'filter'
    });
    this.before = this.column.getFilter() || {filter: '', filterMissing: false};
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
    if (this.column instanceof SetColumn) {
      const every = (<ISetCategoricalFilter>this.before).mode !== 'some';
      node.insertAdjacentHTML('beforeend', `<strong>Show rows where</strong>`);
      node.insertAdjacentHTML('beforeend', `<label class="${cssClass('checkbox')}">
        <input type="radio" ${every ? 'checked="checked"' : ''} name="mode" value="every">
        <span>all are selected</span>
      </label>`);
      node.insertAdjacentHTML('beforeend', `<label class="${cssClass('checkbox')}">
        <input type="radio" ${!every ? 'checked="checked"' : ''} name="mode" value="some">
        <span>some are selected</span>
      </label>`);
    }
    node.insertAdjacentHTML('beforeend', filterMissingMarkup(this.before.filterMissing));

    this.enableLivePreviews('input[type=checkbox],input[type=radio]');
  }

  private updateFilter(filter: string[] | null | RegExp | string, filterMissing: boolean, someMode = false) {
    const noFilter = filter == null && filterMissing === false;
    const f: ISetCategoricalFilter = {filter: filter!, filterMissing};
    if (this.column instanceof SetColumn) {
      f.mode = someMode ? 'some' : 'every';
    }
    this.column.setFilter(noFilter ? null : f);
  }

  protected reset() {
    this.forEach('input[data-cat]', (n: HTMLInputElement) => n.checked = true);
    findFilterMissing(this.node).checked = false;
    const mode = this.findInput('input[value=every]');
    if (mode) {
      mode.checked = true;
    }
  }

  protected cancel() {
    this.updateFilter(this.before.filter === '' ? null : this.before.filter, this.before.filterMissing, (<ISetCategoricalFilter>this.before).mode === 'some');
  }

  protected submit() {
    let f: string[] | null = this.forEach('input[data-cat]', (n: HTMLInputElement) => n.checked ? n.dataset.cat! : '').filter(Boolean);
    if (f.length === this.column.categories.length) { // all checked = no filter
      f = null;
    }
    const filterMissing = findFilterMissing(this.node).checked;
    const mode = this.findInput('input[value=some]');
    this.updateFilter(f, filterMissing, mode != null && mode.checked);
    return true;
  }
}
