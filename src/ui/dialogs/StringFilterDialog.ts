import { StringColumn, IStringFilter } from '../../model';
import { filterMissingMarkup, findFilterMissing } from '../missing';
import ADialog, { IDialogContext } from './ADialog';
import { cssClass } from '../../styles';
import { debounce } from '../../internal';

function toInput(text: string, isRegex: boolean) {
  const v = text.trim();
  if (v === '') {
    return null;
  }
  return isRegex ? new RegExp(v, 'm') : v;
}

/** @internal */
export default class StringFilterDialog extends ADialog {
  private readonly before: IStringFilter | null;

  constructor(private readonly column: StringColumn, dialog: IDialogContext) {
    super(dialog, {
      livePreview: 'filter',
    });

    this.before = this.column.getFilter();
  }

  private updateFilter(filter: string | RegExp | null, filterMissing: boolean) {
    if (filter == null && !filterMissing) {
      this.column.setFilter(null);
    } else {
      this.column.setFilter({ filter, filterMissing });
    }
  }

  protected reset() {
    this.findInput('input[type="text"]').value = '';
    this.forEach('input[type=checkbox]', (n: HTMLInputElement) => (n.checked = false));
  }

  protected cancel() {
    if (this.before) {
      this.updateFilter(this.before.filter === '' ? null : this.before.filter, this.before.filterMissing);
    } else {
      this.updateFilter(null, false);
    }
  }

  protected submit() {
    const filterMissing = findFilterMissing(this.node).checked;
    const input = this.findInput('input[type="text"]').value;
    const isRegex = this.findInput('input[type="checkbox"]').checked;
    this.updateFilter(toInput(input, isRegex), filterMissing);
    return true;
  }

  protected build(node: HTMLElement) {
    const bak = this.column.getFilter() || { filter: '', filterMissing: false };
    node.insertAdjacentHTML(
      'beforeend',
      `<input type="text" placeholder="Filter ${this.column.desc.label}..." autofocus value="${
        bak.filter instanceof RegExp ? bak.filter.source : bak.filter || ''
      }" style="width: 100%">
    <label class="${cssClass('checkbox')}">
      <input type="checkbox" ${bak.filter instanceof RegExp ? 'checked="checked"' : ''}>
      <span>Use regular expressions</span>
    </label>
    ${filterMissingMarkup(bak.filterMissing)}`
    );

    const filterMissing = findFilterMissing(node);
    const input = node.querySelector<HTMLInputElement>('input[type="text"]');
    const isRegex = node.querySelector<HTMLInputElement>('input[type="checkbox"]');

    this.enableLivePreviews([filterMissing, input, isRegex]);

    if (!this.showLivePreviews()) {
      return;
    }
    input.addEventListener(
      'input',
      debounce(() => this.submit(), 100),
      {
        passive: true,
      }
    );
  }
}
