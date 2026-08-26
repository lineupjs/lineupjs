import {
  SetColumn,
  CategoricalColumn,
  CategoricalsColumn,
  type ICategoricalFilter,
  type ISetCategoricalFilter,
  Ranking,
  BooleanColumn,
} from '../../model';
import ADialog, { type IDialogContext } from './ADialog';
import { forEach } from './utils';
import { cssClass, engineCssClass } from '../../styles';
import { isCategoryIncluded } from '../../model/internalCategorical';
import type { IRankingHeaderContext } from '../interfaces';

/** @internal */
export default class CategoricalFilterDialog extends ADialog {
  private readonly before: ICategoricalFilter;

  constructor(
    private readonly column: CategoricalColumn | CategoricalsColumn | SetColumn | BooleanColumn,
    dialog: IDialogContext,
    private readonly ctx: IRankingHeaderContext
  ) {
    super(dialog, {
      livePreview: 'filter',
    });
    this.before = this.column.getFilter() || { filter: '', filterMissing: false };
  }

  protected build(node: HTMLElement) {
    node.insertAdjacentHTML(
      'beforeend',
      `<input type="text" placeholder="Filter categories…" aria-label="Filter categories" class="${cssClass('dialog-filter-cat-search')}">
      <div class="${cssClass('dialog-table')}">
        <label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')}">
          <input type="checkbox" checked>
          <span>
            <span class="${cssClass('dialog-filter-table-color')}"></span>
            <div>Un/Select All</div>
          </span>
        </label>
        ${this.column.categories
          .map(
            (c) => `<label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')}" data-cat="">
          <input data-cat="" type="checkbox"${isCategoryIncluded(this.before, c) ? 'checked' : ''}>
          <span>
            <span class="${cssClass('dialog-filter-table-color')}" style="background-color: ${this.ctx.sanitize(
              c.color
            )}"></span>
            <div class="${cssClass('dialog-filter-table-entry-label')}"> </div>
            <div class="${cssClass('dialog-filter-table-entry-stats')}"></div>
          </span>
        </label>`
          )
          .join('')}
        <label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')}" data-missing="">
          <input type="checkbox" ${!this.before.filterMissing ? 'checked="checked"' : ''} data-missing="">
          <span>
            <span class="${cssClass('dialog-filter-table-color')} ${cssClass('missing')}"></span>
            <div class="${cssClass('dialog-filter-table-entry-label')}">missing value rows</div>
            <div class="${cssClass('dialog-filter-table-entry-stats')}">0</div>
          </span>
        </label>
    </div>`
    );
    const categories = this.column.categories;
    const catLabels = new Map<string, string>();
    Array.from(node.querySelectorAll(`label.${cssClass('checkbox')}[data-cat]`)).forEach((n, i) => {
      const cat = categories[i];
      (n.firstElementChild as HTMLElement).dataset.cat = cat.name;
      n.querySelector(`.${cssClass('dialog-filter-table-entry-label')}`).textContent = cat.label;
      catLabels.set(cat.name, cat.label.toLowerCase());
    });

    // selectAll
    const selectAll = this.findInput('input[type=checkbox]:not([data-cat]):not([data-missing])');
    selectAll.onchange = () => {
      forEach(
        node,
        `label[data-cat]:not(.${cssClass('hidden')}) input[data-cat],input[data-missing]`,
        (n: HTMLInputElement) => (n.checked = selectAll.checked)
      );
    };

    const searchInput = node.querySelector<HTMLInputElement>(`.${cssClass('dialog-filter-cat-search')}`)!;
    searchInput.oninput = () => {
      const query = searchInput.value.toLowerCase().trim();
      node.querySelectorAll<HTMLElement>(`label[data-cat]`).forEach((label) => {
        const catName = (label.firstElementChild as HTMLInputElement).dataset.cat ?? '';
        const labelText = catLabels.get(catName) ?? catName.toLowerCase();
        const hidden = query.length > 0 && !labelText.includes(query);
        label.classList.toggle(cssClass('hidden'), hidden);
      });
      this.updateSelectAll();
    };
    // prevent Enter from implicitly submitting (and closing) the dialog while searching
    searchInput.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter') {
        evt.preventDefault();
      }
    });
    node.querySelectorAll<HTMLInputElement>('input[data-cat]').forEach((input) => {
      input.addEventListener('change', () => this.updateSelectAll());
    });
    // reflect the initial (possibly partial) selection in the select-all checkbox
    this.updateSelectAll();
    if (this.column instanceof SetColumn || this.column instanceof CategoricalsColumn) {
      const some = (this.before as ISetCategoricalFilter).mode !== 'every';
      node.insertAdjacentHTML('beforeend', `<strong>Show rows where</strong>`);
      node.insertAdjacentHTML(
        'beforeend',
        `<label class="${cssClass('checkbox')}">
        <input type="radio" ${!some ? 'checked="checked"' : ''} name="mode" value="every">
        <span title="The row must include every selected category.">Contains all selected values</span>
      </label>`
      );
      node.insertAdjacentHTML(
        'beforeend',
        `<label class="${cssClass('checkbox')}" style="padding-bottom: 0.6em">
        <input type="radio" ${some ? 'checked="checked"' : ''} name="mode" value="some">
        <span title="The row must include one or more selected categories.">Contains at least one selected value</span>
      </label>`
      );
    }
    this.enableLivePreviews('input[type=checkbox],input[type=radio]');

    const ranking = this.column.findMyRanker()!;
    if (ranking) {
      ranking.on(`${Ranking.EVENT_ORDER_CHANGED}.catFilter`, () => this.updateStats());
    }
    this.updateStats();
  }

  private updateSelectAll() {
    const selectAll = this.findInput('input[type=checkbox]:not([data-cat]):not([data-missing])');
    const visibleInputs = this.forEach(
      `label[data-cat]:not(.${cssClass('hidden')}) input[data-cat]`,
      (n: HTMLInputElement) => n
    );
    if (visibleInputs.length === 0) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
      return;
    }
    const checkedCount = visibleInputs.filter((n) => n.checked).length;
    if (checkedCount === 0) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    } else if (checkedCount === visibleInputs.length) {
      selectAll.checked = true;
      selectAll.indeterminate = false;
    } else {
      selectAll.checked = false;
      selectAll.indeterminate = true;
    }
  }

  private updateStats() {
    const ready = this.ctx.provider
      .getTaskExecutor()
      .summaryCategoricalStats(this.column)
      .then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const { summary, data } = r;

        if (!summary || !data) {
          return;
        }
        const missingNode = this.find(`label[data-missing] .${cssClass('dialog-filter-table-entry-stats')}`);
        missingNode.textContent = `${summary.missing.toLocaleString()}/${data.count.toLocaleString()}`;
        this.forEach(`label[data-cat] .${cssClass('dialog-filter-table-entry-stats')}`, (n: HTMLElement, i) => {
          const bin = summary.hist[i];
          const raw = data.hist[i];
          n.textContent = `${bin.count.toLocaleString()}/${raw.count.toLocaleString()}`;
        });
      });
    if (!ready) {
      return;
    }
    this.node.classList.add(engineCssClass('loading'));
    ready.then(() => {
      this.node.classList.remove(engineCssClass('loading'));
    });
  }

  private updateFilter(filter: string[] | null | RegExp | string, filterMissing: boolean, someMode = false) {
    const noFilter = filter == null && filterMissing === false;
    const f: ISetCategoricalFilter = { filter: filter!, filterMissing };
    if (this.column instanceof SetColumn || this.column instanceof CategoricalsColumn) {
      f.mode = someMode ? 'some' : 'every';
    }
    this.column.setFilter(noFilter ? null : f);
  }

  protected reset() {
    this.forEach('input[data-cat]', (n: HTMLInputElement) => (n.checked = true));
    this.findInput('input[data-missing]').checked = true;
    // clear the search field and restore all category rows
    const searchInput = this.node.querySelector<HTMLInputElement>(`.${cssClass('dialog-filter-cat-search')}`);
    if (searchInput) {
      searchInput.value = '';
      this.node.querySelectorAll<HTMLElement>(`label[data-cat]`).forEach((label) => {
        label.classList.remove(cssClass('hidden'));
      });
    }
    this.updateSelectAll();

    const mode = this.findInput('input[value=every]');
    if (mode) {
      mode.checked = true;
    }
  }

  protected cancel() {
    this.updateFilter(
      this.before.filter === '' ? null : this.before.filter,
      this.before.filterMissing,
      (this.before as ISetCategoricalFilter).mode === 'some'
    );
  }

  protected submit() {
    let f: string[] | null = this.forEach('input[data-cat]:checked', (n: HTMLInputElement) => n.dataset.cat!);
    if (f.length === this.column.categories.length) {
      // all checked = no filter
      f = null;
    }
    // TODO
    const filterMissing = !this.findInput('input[data-missing]').checked;
    const mode = this.findInput('input[value=some]');
    this.updateFilter(f, filterMissing, mode != null && mode.checked);
    return true;
  }

  cleanUp(action: 'cancel' | 'confirm' | 'handled') {
    super.cleanUp(action);
    const ranking = this.column.findMyRanker()!;
    if (ranking) {
      ranking.on(`${Ranking.EVENT_ORDER_CHANGED}.catFilter`, null);
    }
  }
}
