import StringColumn from '../../model/StringColumn';
import {filterMissingMarkup} from '../missing';

export default class StringSummary {
  readonly update: () => void;

  constructor(private readonly col: StringColumn, private readonly node: HTMLElement, interactive: boolean) {
    node.dataset.summary = 'string';
    if (!interactive) {
      this.update = () => {
        const filter = col.getFilter() || '';
        node.textContent = filter === StringColumn.FILTER_MISSING ? '' : String(filter);
      };
      this.update();
      return;
    }
    this.update = this.initInteractive();
  }

  private initInteractive() {
    let bak = this.col.getFilter() || '';
    const bakMissing = bak === StringColumn.FILTER_MISSING;
    if (bakMissing) {
      bak = '';
    }
    this.node.insertAdjacentHTML('beforeend', `<input type="text" placeholder="containing..." autofocus value="${(bak instanceof RegExp) ? bak.source : bak}" style="width: 100%">
    <label><input type="checkbox" ${(bak instanceof RegExp) ? 'checked="checked"' : ''}>RegExp</label>
    ${filterMissingMarkup(bakMissing)}`);

    const filterMissing = <HTMLInputElement>this.node.querySelector('input[type="checkbox"].lu_filter_missing');
    const input = <HTMLInputElement>this.node.querySelector('input[type="text"]');
    const isRegex = <HTMLInputElement>this.node.querySelector('input[type="checkbox"]:first-of-type');

    const update = () => {
      if (filterMissing.checked) {
        this.col.setFilter(StringColumn.FILTER_MISSING);
        return;
      }
      this.col.setFilter(isRegex ? new RegExp(input.value) : input.value);
    };

    filterMissing.onchange = update;
    input.onchange = update;
    isRegex.onchange = update;

    return () => {
      let bak = this.col.getFilter() || '';
      const bakMissing = bak === StringColumn.FILTER_MISSING;
      if (bakMissing) {
        bak = '';
      }
      filterMissing.checked = bakMissing;
      input.value = bak instanceof RegExp ? bak.source : bak;
      isRegex.checked = bak instanceof RegExp;
    };
  }
}
