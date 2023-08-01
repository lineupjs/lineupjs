import type { Column } from '../../model';
import type { IDataProvider } from '../../provider';
import ADialog, { type IDialogContext } from './ADialog';
import { cssClass } from '../../styles';
import { debounce } from '../../internal';

/** @internal */
export default class SearchDialog extends ADialog {
  private current: {
    isRegex: boolean;
    search: string;
    indices: number[];
    index: number;
  } | null = null;

  constructor(private readonly column: Column, dialog: IDialogContext, private readonly provider: IDataProvider) {
    super(dialog, {
      livePreview: 'search',
    });
  }

  protected build(node: HTMLElement) {
    node.insertAdjacentHTML(
      'beforeend',
      `<input type="text" size="20" value="" required autofocus placeholder="search... (>= 3 chars)">
      <label class="${cssClass('checkbox')}">
        <input type="checkbox">
        <span>Use regular expressions</span>
      </label>
    `
    );

    const input = node.querySelector<HTMLInputElement>('input[type="text"]')!;
    const checkbox = node.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    const update = () => {
      const search: any = input.value;
      if (search.length < 3) {
        input.setCustomValidity('at least 3 characters');
        return;
      }
      input.setCustomValidity('');
    };
    input.addEventListener('input', update, {
      passive: true,
    });
    checkbox.addEventListener('change', update, {
      passive: true,
    });
    this.enableLivePreviews([input, checkbox]);

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

  protected submit() {
    const input = this.findInput('input[type="text"]')!;
    const checkbox = this.findInput('input[type="checkbox"]')!;

    let search: string = input.value;
    const isRegex = checkbox.checked;
    if (this.current && this.current.search === search && this.current.isRegex === isRegex) {
      const next = (this.current.index + 1) % this.current.indices.length;
      this.current.index = next;
      this.provider.jumpToNearest([this.current.indices[next]]);
      return false;
    } else {
      const indices = this.provider.searchAndJump(isRegex ? new RegExp(search) : search, this.column, true);
      if (indices) {
        this.current = {
          search,
          isRegex,
          indices,
          index: 0,
        };
        return indices.length > 1;
      } else {
        this.current = null;
      }
    }

    return true;
  }

  protected reset() {
    const input = this.findInput('input[type="text"]')!;
    const checkbox = this.findInput('input[type="checkbox"]')!;
    input.value = '';
    checkbox.checked = false;
  }

  protected cancel() {
    // nothing to do
  }
}
