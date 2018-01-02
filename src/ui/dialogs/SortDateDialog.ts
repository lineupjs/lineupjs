import DatesColumn, {DateSort} from '../../model/DatesColumn';
import ADialog from './ADialog';

export default class SortDateDialog extends ADialog {
  constructor(private readonly column: DatesColumn, header: HTMLElement, title = 'Sort Criteria') {
    super(header, title);
  }

  openDialog() {
    const bak = this.column.getSortMethod();
    const valueString = ['min', 'max', 'median'];

    const order = this.column.isSortedByMe().asc;

    const sortMethods = valueString.map((d) => {
      return `<label><input type="radio" name="multivaluesort" value="${d}"  ${(bak === d) ? 'checked' : ''} > ${d.slice(0, 1).toUpperCase() + d.slice(1)}</label><br>`;
    }).join('\n');
    const sortOrders = `
        <label><input type="radio" name="sortorder" value="asc"  ${(order === 'asc') ? 'checked' : ''} > Ascending</label><br>
        <label><input type="radio" name="sortorder" value="desc"  ${(order === 'desc') ? 'checked' : ''} > Decending</label><br>`;

    const popup = this.makeChoosePopup(`${sortMethods}<strong>Sort Order</strong><br>${sortOrders}`);

    Array.from(popup.querySelectorAll('input[name=multivaluesort]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setSortMethod(<DateSort>n.value));
    });
    Array.from(popup.querySelectorAll('input[name=sortorder]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => {
        this.column.sortByMe(n.value === 'asc');
      });
    });
  }

}
