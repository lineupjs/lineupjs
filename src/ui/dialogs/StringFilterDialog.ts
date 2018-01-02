import StringColumn from '../../model/StringColumn';
import ADialog from './ADialog';


export default class StringFilterDialog extends ADialog {
  private readonly base: any;

  constructor(private readonly column: StringColumn, attachment: HTMLElement) {
    super(attachment, {
      fullDialog: true
    });
    this.base = stringFilter(this.column);
  }

  private updateFilter(filter: string | RegExp | null) {
    this.attachment.classList.toggle('lu-filtered', filter != null);
    this.column.setFilter(filter);
  }

  reset() {
    this.findInput('input[type="text"]').value = '';
    this.forEach('input[type=checkbox', (n: HTMLInputElement) => n.checked = false);
    this.updateFilter(null);
  }

  submit() {
    const isTrue = this.findInput('input[type="radio"][value="true"]').checked;
    const isFalse = this.findInput('input[type="radio"][value="false"]').checked;
    this.updateFilter(isTrue ? true : (isFalse ? false : null));
    return true;
  }

  protected build(node: HTMLElement) {
    node.insertAdjacentHTML('beforeend', this.base.template);

    const updateData = (filter: string | RegExp | null) => {
      this.markFiltered(filter != null && filter !== '');
      this.column.setFilter(filter);
    };

    const update = base.init(<HTMLElement>popup.querySelector('form')!, (filtered) => this.markFiltered(filtered));

    this.onButton(popup, {
      cancel: () => {
        updateData(base.original);
      },
      reset: () => {
        (<HTMLInputElement>popup.querySelector('input[type="text"]')).value = '';
        Array.from(popup.querySelectorAll('input[type=checkbox')).forEach((n: HTMLInputElement) => n.checked = false);
        updateData(null);
      },
      submit: () => {
        update(true);
        return true;
      }
    });
  }
}

export function stringFilter(col: StringColumn) {
  let bak = col.getFilter() || '';
  const original = bak;
  const bakMissing = bak === StringColumn.FILTER_MISSING;
  if (bakMissing) {
    bak = '';
  }

  return {
    original,
    template: `<input type="text" placeholder="containing..." autofocus value="${(bak instanceof RegExp) ? bak.source : bak}" style="width: 100%">
  <br><label><input type="checkbox" ${(bak instanceof RegExp) ? 'checked="checked"' : ''}>RegExp</label>
  ${filterMissingMarkup(bakMissing)}`,
    update(node: HTMLElement) {
      const isRegex = <HTMLInputElement>node.querySelector('input[type="checkbox"]:first-of-type');
      const filterMissing = <HTMLInputElement>node.querySelector('input[type="checkbox"].lu_filter_missing');
      const input = <HTMLInputElement>node.querySelector('input[type="text"]');
      isRegex.checked = bak instanceof RegExp;
      filterMissing.checked = bakMissing;
      if (input.value !== bak) {
        input.value = (bak instanceof RegExp) ? bak.source : bak;
      }
    },
    init(node: HTMLElement, filterCallback?: (filtered: boolean) => void) {

      const isRegex = <HTMLInputElement>node.querySelector('input[type="checkbox"]:first-of-type');
      const filterMissing = <HTMLInputElement>node.querySelector('input[type="checkbox"].lu_filter_missing');
      const input = <HTMLInputElement>node.querySelector('input[type="text"]');

      const updateData = (filter: string | RegExp | null) => {
        if (filterCallback) {
          filterCallback((filter != null && filter !== ''));
        }
        col.setFilter(filter);
      };

      function updateImpl(force: boolean) {
        //get value
        let search: any = input.value;

        if (filterMissing.checked && search === '') {
          search = StringColumn.FILTER_MISSING;
        }
        if (search === '') { //reset
          updateData(search);
          return;
        }
        if (search.length < 3 && !force) {
          return;
        }
        if (isRegex.checked && search !== StringColumn.FILTER_MISSING) {
          search = new RegExp(search);
        }
        updateData(search);
      }

      isRegex.onchange = () => updateImpl(false);
      filterMissing.onchange = () => updateImpl(false);
      input.oninput = () => updateImpl(false);

      return updateImpl;
    }
  };
}
