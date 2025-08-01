import type { Column } from '../../model';
import { EStringFilterType } from '../../model/StringColumn';
import type { IDataProvider } from '../../provider';
import ADialog, { type IDialogContext } from './ADialog';
import { aria, cssClass } from '../../styles';
import { debounce } from '../../internal';

/** @internal */
export default class SearchDialog extends ADialog {
  private current: {
    filterType: EStringFilterType;
    search: string | RegExp;
    indices: number[];
    index: number;
  } | null = null;

  constructor(
    private readonly column: Column,
    dialog: IDialogContext,
    private readonly provider: IDataProvider
  ) {
    super(dialog, {
      livePreview: 'search',
    });
  }

  protected build(node: HTMLElement) {
    const displayFilterType = this.current?.filterType || EStringFilterType.contains;

    // NOTE: the next button is of type submit to enable jumping to the next search result with the enter key in the search input field
    node.insertAdjacentHTML(
      'beforeend',
      `<div class="${cssClass('string-search-dialog')}">
        <input type="text" size="20" value="" required autofocus placeholder="Enter a search term...">
        <div class="${cssClass('search-count')}" hidden>
          <span class="${cssClass('search-current')}"></span>/<span class="${cssClass('search-total')}"></span>
        </div>
        <button type="button" class="${cssClass('previous-result')}" title="Previous search result" disabled>${aria('Previous search result')}</button>
        <button type="submit" class="${cssClass('next-result')}" title="Next search result" disabled>${aria('Next search result')}</button>
      </div>
      <details class="${cssClass('string-advanced-options')}">
      <summary>Advanced options</summary>
      <span class="${cssClass('search-options-title')}">Find rows that &hellip;</span>
      <label class="${cssClass('checkbox')}">
        <input type="radio" name="searchOptions" value="${EStringFilterType.contains}" ${displayFilterType === EStringFilterType.contains ? 'checked="checked"' : ''}>
        <span>Contain the search terms</span>
      </label>
      <label class="${cssClass('checkbox')}">
        <input type="radio" name="searchOptions" value="${EStringFilterType.exact}" ${displayFilterType === EStringFilterType.exact ? 'checked="checked"' : ''}>
        <span>Exactly match the search terms</span>
      </label>
      <label class="${cssClass('checkbox')}">
        <input type="radio" name="searchOptions" value="${EStringFilterType.startsWith}" ${displayFilterType === EStringFilterType.startsWith ? 'checked="checked"' : ''}>
        <span>Start with the search terms</span>
      </label>
      <label class="${cssClass('checkbox')}">
        <input type="radio" name="searchOptions" value="${EStringFilterType.regex}" ${displayFilterType === EStringFilterType.regex ? 'checked="checked"' : ''}>
        <span>Match as regular expression</span>
      </label>
    </details>`
    );

    const input = node.querySelector<HTMLInputElement>('input[type="text"]')!;
    const radioButtons = node.querySelectorAll<HTMLInputElement>('input[name="searchOptions"]')!;
    const previous = node.querySelector<HTMLButtonElement>(`.${cssClass('previous-result')}`)!;
    const next = node.querySelector<HTMLButtonElement>(`.${cssClass('next-result')}`)!;

    const update = () => {
      const search = input.value;
      if (search.length === 0) {
        input.setCustomValidity('Enter a search term');
        return;
      }
      input.setCustomValidity('');
    };

    input.addEventListener('input', update, {
      passive: true,
    });

    radioButtons.forEach((radio) => {
      radio.addEventListener(
        'change',
        () => {
          this.current!.filterType = radio.value as EStringFilterType;
          update();
          this.searchAndJump();
        },
        {
          passive: true,
        }
      );
    });

    previous.addEventListener('click', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      this.jumpToPreviousResult();
    });

    next.addEventListener('click', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      this.jumpToNextResult();
    });

    this.enableLivePreviews([input, ...Array.from(radioButtons)]);

    if (!this.showLivePreviews()) {
      return;
    }

    input.addEventListener(
      'input',
      debounce(() => this.searchAndJump(), 100),
      {
        passive: true,
      }
    );
  }

  private jumpToPreviousResult() {
    if (this.current) {
      const searchCount = this.find<HTMLElement>(`.${cssClass('search-count')}`)!;
      const current = searchCount.querySelector(`.${cssClass('search-current')}`)!;

      const previous = (this.current.index - 1 + this.current.indices.length) % this.current.indices.length;
      this.current.index = previous;
      current.textContent = String(previous + 1);
      this.provider.jumpToNearest([this.current.indices[previous]]);
    }
  }

  private jumpToNextResult() {
    if (this.current) {
      const searchCount = this.find<HTMLElement>(`.${cssClass('search-count')}`)!;
      const current = searchCount.querySelector(`.${cssClass('search-current')}`)!;

      const next = (this.current.index + 1) % this.current.indices.length;
      this.current.index = next;
      current.textContent = String(next + 1);
      this.provider.jumpToNearest([this.current.indices[next]]);
    }
  }

  private searchAndJump() {
    const input = this.findInput('input[type="text"]')!;
    const checkedRadio = this.node.querySelector<HTMLInputElement>('input[name="searchOptions"]:checked')!;
    const previous = this.find<HTMLButtonElement>(`.${cssClass('previous-result')}`)!;
    const next = this.find<HTMLButtonElement>(`.${cssClass('next-result')}`)!;
    const searchCount = this.find<HTMLElement>(`.${cssClass('search-count')}`)!;

    const filterType = (checkedRadio?.value as EStringFilterType) || EStringFilterType.contains;
    const search: string | RegExp = filterType == EStringFilterType.regex ? new RegExp(input.value, 'mi') : input.value;

    if (search instanceof RegExp) {
      search.lastIndex = 0; // reset regex lastIndex
    } else if (search.length === 0) {
      this.current = null;
      previous.disabled = true;
      next.disabled = true;
      searchCount.hidden = true;
      return false;
    }

    const indices = this.provider.searchAndJump(search, this.column, true, filterType);
    if (indices) {
      this.current = {
        search,
        filterType,
        indices,
        index: 0,
      };

      const current = searchCount.querySelector(`.${cssClass('search-current')}`)!;
      const total = searchCount.querySelector(`.${cssClass('search-total')}`)!;
      current.textContent = String(indices.length < 1 ? this.current.index : this.current.index + 1);
      total.textContent = String(indices.length);
      searchCount.hidden = false;

      previous.disabled = indices.length < 1;
      next.disabled = indices.length < 1;

      return indices.length > 1;
    } else {
      this.current = null;
      searchCount.hidden = true;
      previous.disabled = true;
      next.disabled = true;
    }

    return true;
  }

  protected submit() {
    return true;
  }

  protected reset() {
    this.provider.jumpToNearest([-1]); // remove row highlight from ranking

    const input = this.findInput('input[type="text"]')!;
    const previous = this.find<HTMLButtonElement>(`.${cssClass('previous-result')}`)!;
    const next = this.find<HTMLButtonElement>(`.${cssClass('next-result')}`)!;
    const searchCount = this.find<HTMLElement>(`.${cssClass('search-count')}`)!;

    this.current = null;
    input.value = '';

    // Reset to contains search option
    const containsRadio = this.node.querySelector<HTMLInputElement>(
      `input[name="searchOptions"][value="${EStringFilterType.contains}"]`
    );
    if (containsRadio) {
      containsRadio.checked = true;
    }

    previous.disabled = true;
    next.disabled = true;
    searchCount.hidden = true;
  }

  protected cancel() {
    // nothing to do
  }
}
