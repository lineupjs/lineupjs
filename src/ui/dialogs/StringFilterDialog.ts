import type { StringColumn, IStringFilter, EStringFilterType } from '../../model';
import { filterMissingMarkup, findFilterMissing } from '../missing';
import ADialog, { type IDialogContext } from './ADialog';
import { cssClass } from '../../styles';
import { debounce } from '../../internal';
import type { IRankingHeaderContext } from '../interfaces';
import { filterToString, matchDataList } from '../../renderer/StringCellRenderer';

function toInput(text: string, filterType: EStringFilterType) {
  const v = text.trim();
  if (v === '') {
    return null;
  }
  return filterType === EStringFilterType.regex ? new RegExp(v, 'm') : v;
}

/** @internal */
export default class StringFilterDialog extends ADialog {
  private readonly before: IStringFilter | null;

  constructor(
    private readonly column: StringColumn,
    dialog: IDialogContext,
    private readonly ctx: IRankingHeaderContext
  ) {
    super(dialog, {
      livePreview: 'filter',
    });

    this.before = this.column.getFilter();
  }

  private updateFilter(filter: string | RegExp | null, filterMissing: boolean, filterType: EStringFilterType = EStringFilterType.contains) {
    if (filter == null && !filterMissing) {
      this.column.setFilter(null);
    } else {
      this.column.setFilter({ filter, filterMissing, filterType });
    }
  }

  protected reset() {
    this.findInput('input[type="text"]').value = '';
    this.forEach('input[type=checkbox]', (n: HTMLInputElement) => (n.checked = false));
    // Reset radio buttons to "Contains word"
    const containsRadio = this.node.querySelector<HTMLInputElement>(`input[name="searchOptions"][value="${EStringFilterType.contains}"]`);
    if (containsRadio) {
      containsRadio.checked = true;
    }
  }

  protected cancel() {
    if (this.before) {
      this.updateFilter(
        this.before.filter === '' ? null : this.before.filter, 
        this.before.filterMissing,
        this.before.filterType || EStringFilterType.contains
      );
    } else {
      this.updateFilter(null, false, EStringFilterType.contains);
    }
  }

  protected submit() {
    const filterMissing = findFilterMissing(this.node).checked;
    const input = this.findInput('input[type="text"]').value;
    const checkedRadio = this.node.querySelector<HTMLInputElement>('input[name="searchOptions"]:checked');
    const filterType = (checkedRadio?.value as EStringFilterType) || EStringFilterType.contains;
    this.updateFilter(toInput(input, filterType), filterMissing, filterType);
    return true;
  }

  protected build(node: HTMLElement) {
    const s = this.ctx.sanitize;
    const bak = this.column.getFilter() || { filter: '', filterMissing: false, filterType: EStringFilterType.contains };
    const currentFilterType = bak.filterType || EStringFilterType.contains;
    const isRegexFilter = bak.filter instanceof RegExp;
    const displayFilterType = isRegexFilter ? EStringFilterType.regex : currentFilterType;
    
    node.insertAdjacentHTML(
      'beforeend',
      `<input type="text" placeholder="Filter ${s(this.column.desc.label)} …" autofocus
         value="${filterToString(bak)}" list="${this.dialog.idPrefix}_sdl">
    ${filterMissingMarkup(bak.filterMissing)}
    <datalist id="${this.dialog.idPrefix}_sdl"></datalist>
    <details class="${cssClass('advanced-options')}" style="margin-top: 1em;">
      <summary>Advanced options</summary>
      <div style="margin-top: 0.5em;">
        <fieldset>
          <legend>Search options</legend>
          <label class="${cssClass('checkbox')}">
            <input type="radio" name="searchOptions" value="${EStringFilterType.contains}" ${displayFilterType === EStringFilterType.contains ? 'checked="checked"' : ''}>
            <span>Contains word</span>
          </label>
          <label class="${cssClass('checkbox')}">
            <input type="radio" name="searchOptions" value="${EStringFilterType.startsWith}" ${displayFilterType === EStringFilterType.startsWith ? 'checked="checked"' : ''}>
            <span>Starts with word</span>
          </label>
          <label class="${cssClass('checkbox')}">
            <input type="radio" name="searchOptions" value="${EStringFilterType.regex}" ${displayFilterType === EStringFilterType.regex ? 'checked="checked"' : ''}>
            <span>Use regular expressions</span>
          </label>
        </fieldset>
      </div>
    </details>`
    );

    const filterMissing = findFilterMissing(node);
    const input = node.querySelector<HTMLInputElement>('input[type="text"]');
    const radioButtons = node.querySelectorAll<HTMLInputElement>('input[name="searchOptions"]');

    const dl = node.querySelector('datalist')!;
    this.ctx.provider
      .getTaskExecutor()
      .summaryStringStats(this.column)
      .then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const { summary } = r;
        matchDataList(dl, summary.topN);
      });

    this.enableLivePreviews([filterMissing, input, ...Array.from(radioButtons)]);

    if (!this.showLivePreviews()) {
      return;
    }
    input.addEventListener(
      'input',
      debounce(() => {
        const input = this.findInput('input[type="text"]').value;
        if (input.length > 0 && !this.before) {
          findFilterMissing(this.node).checked = true;
        }
        this.submit();
      }, 100),
      {
        passive: true,
      }
    );
  }
}
