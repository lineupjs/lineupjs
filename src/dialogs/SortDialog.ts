import Column from '../model/Column';
import ADialog from './ADialog';
import NumberColumn from '../model/NumberColumn';
import {ADVANCED_SORT_METHOD, IBoxPlotColumn, SORT_METHOD} from '../model/INumberColumn';
import BoxPlotColumn from '../model/BoxPlotColumn';

export default class SortDialog extends ADialog {
  constructor(private readonly column: (IBoxPlotColumn|NumberColumn) & Column, header: HTMLElement, title = 'Sort Criteria') {
    super(header, title);
  }

  protected build():HTMLElement {
    const bak = this.column.getSortMethod();
    const valueString = Object.keys(this.column instanceof BoxPlotColumn ? SORT_METHOD: ADVANCED_SORT_METHOD);

    const order = this.column instanceof NumberColumn ? this.column.isGroupSortedByMe().asc : this.column.isSortedByMe().asc;

    const sortMethods = valueString.map((d) => {
      return `<label><input type="radio" name="multivaluesort" value="${d}"  ${(bak === d) ? 'checked' : ''} > ${d.slice(0, 1).toUpperCase() + d.slice(1)}</label><br>`;
    }).join('\n');
    const sortOrders = `
        <label><input type="radio" name="sortorder" value="asc"  ${(order === 'asc') ? 'checked' : ''} > Ascending</label><br>
        <label><input type="radio" name="sortorder" value="desc"  ${(order === 'desc') ? 'checked' : ''} > Decending</label><br>`;

    const popup = this.makeChoosePopup( `${sortMethods}<strong>Sort Order</strong><br>${sortOrders}`);

    Array.from(popup.querySelectorAll('input[name=multivaluesort]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setSortMethod(n.value));
    });
    Array.from(popup.querySelectorAll('input[name=sortorder]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => {
        if (this.column instanceof NumberColumn) {
          this.column.groupSortByMe(n.value === 'asc');
        } else {
          this.column.sortByMe(n.value === 'asc');
        }
      });
    });

    return popup;
  }

}
