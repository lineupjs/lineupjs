import type { SelectionColumn } from '../../model';
import ADialog, { IDialogContext } from './ADialog';
import { cssClass } from '../../styles';
import type { IRankingHeaderContext } from '../interfaces';

/** @internal */
export default class SelectionFilterDialog extends ADialog {
  private readonly before: number[] | null;

  constructor(
    private readonly column: SelectionColumn,
    dialog: IDialogContext,
    private readonly ctx: IRankingHeaderContext
  ) {
    super(dialog, {
      livePreview: 'filter',
    });

    this.before = this.column.getFilter();
  }

  private updateFilter(filter: number[] | null) {
    this.column.setFilter(filter);
  }

  protected reset() {
    this.findInput('input[value=none]').checked = true;
  }

  protected cancel() {
    if (this.before) {
      this.updateFilter(this.before);
    } else {
      this.updateFilter(null);
    }
  }

  protected submit() {
    const chosen = (this.findInput('input[name=mode]:checked')?.value as 'none' | 'keep' | 'update') ?? 'keep';
    if (chosen === 'none') {
      this.updateFilter(null);
    } else if (chosen === 'update') {
      this.updateFilter(this.ctx.provider.getSelection());
    }
    return true;
  }

  private guessRemoveFilter() {
    const total = this.ctx.provider.getTotalNumberOfRows();
    const ranking = this.column.findMyRanker();
    const hasOtherFilter = ranking.flatColumns.some((d) => d.isFiltered() && d !== this.column);
    return hasOtherFilter ? '?' : total.toLocaleString();
  }

  protected build(node: HTMLElement) {
    const filtered = this.column.getFilter() ?? [];
    const selected = this.ctx.provider.getSelection().length;
    const total = this.ctx.provider.getTotalNumberOfRows();
    const visible = this.column.findMyRanker().getOrderLength();

    if (selected === 0 && filtered.length === 0) {
      // no rows selected and no filter set
      node.insertAdjacentText('beforeend', 'Select rows to apply this filter');
    } else if (selected > 0 && filtered.length === 0) {
      // rows select but no filter yet
      node.insertAdjacentHTML(
        'beforeend',
        `<div class="${cssClass('dialog-table')}">
        <label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')} ${cssClass(
          'dialog-table-entry-wide'
        )}">
          <input type="radio" checked="checked" name="mode" value="none">
          <span>
            <div class="${cssClass('dialog-filter-table-entry-label')}">No filter</div>
            <div class="${cssClass(
              'dialog-filter-table-entry-stats'
            )}">${visible.toLocaleString()}/${total.toLocaleString()}</div>
          </span>
        </label>
        <label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')} ${cssClass(
          'dialog-table-entry-wide'
        )}">
          <input type="radio" name="mode" value="update">
          <span>
            <div class="${cssClass('dialog-filter-table-entry-label')}">Set filter to current selection</div>
            <div class="${cssClass(
              'dialog-filter-table-entry-stats'
            )}">${selected.toLocaleString()}/${total.toLocaleString()}</div>
          </span>
        </label>
      </div>`
      );
    } else {
      const guessedRemoved = this.guessRemoveFilter();
      node.insertAdjacentHTML(
        'beforeend',
        `<div class="${cssClass('dialog-table')}" >
        <label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')} ${cssClass(
          'dialog-table-entry-wide'
        )}">
          <input type="radio" ${filtered.length === 0 ? 'checked="checked"' : ''} name="mode" value="none">
          <span>
            <div class="${cssClass('dialog-filter-table-entry-label')}">Remove filter</div>
            <div class="${cssClass(
              'dialog-filter-table-entry-stats'
            )}">${guessedRemoved}/${total.toLocaleString()}</div>
          </span>
        </label>
        <label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')} ${cssClass(
          'dialog-table-entry-wide'
        )}">
          <input type="radio" ${filtered.length > 0 ? 'checked="checked"' : ''} name="mode" value="keep">
          <span>
            <div class="${cssClass('dialog-filter-table-entry-label')}">Keep current filter</div>
            <div class="${cssClass(
              'dialog-filter-table-entry-stats'
            )}">${filtered.length.toLocaleString()}/${total.toLocaleString()}</div>
          </span>
        </label>
        <label class="${cssClass('checkbox')} ${cssClass('dialog-filter-table-entry')} ${cssClass(
          'dialog-table-entry-wide'
        )}">
          <input type="radio" name="mode" value="update" ${selected === 0 ? 'disabled="disabled"' : ''}>
          <span>
            <div class="${cssClass('dialog-filter-table-entry-label')}">Set filter to current selection</div>
            <div class="${cssClass(
              'dialog-filter-table-entry-stats'
            )}">${selected.toLocaleString()}/${total.toLocaleString()}</div>
          </span>
        </label>
      </div>`
      );
    }
    const inputs = Array.from(node.querySelectorAll('input'));

    this.enableLivePreviews(inputs);
  }
}
