import Column from '../model/Column';
import ADialog from './ADialog';
import {IBoxPlotColumn, SORT_METHOD} from '../model/BoxPlotColumn';
import NumbersColumn, {SORT_METHOD as ADVANCED_SORT_METHOD,} from '../model/NumbersColumn';

export default class SortDialog extends ADialog {
  constructor(private readonly column: IBoxPlotColumn & Column, header: HTMLElement, title = 'Change Sort Criteria') {
    super(header, title);
  }

  openDialog() {
    const bak = this.column.getSortMethod();
    const valueString = Object.keys(this.column instanceof NumbersColumn ? ADVANCED_SORT_METHOD : SORT_METHOD);

    const popup = this.makeChoosePopup(valueString.map((d) => {
      return `<input type="radio" name="multivaluesort" value=${d}  ${(bak === d) ? 'checked' : ''} > ${d.slice(0, 1).toUpperCase() + d.slice(1)} <br>`;
    }).join('\n'));

    Array.from(popup.querySelectorAll('input[name=multivaluesort]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setSortMethod(n.value));
    });
  }

}
