import ADialog, {IMaskRect} from './ADialog';
import GroupColumn from '../model/GroupColumn';

export default class SortDialog extends ADialog {

  constructor(private readonly column: GroupColumn, header: HTMLElement, title = 'Change Sort Criteria', public backdropMaskRect:() => IMaskRect) {
    super(header, title);
  }

  protected build():HTMLElement {
    const bak = this.column.getSortMethod();
    const valueString = ['name', 'count'];

    const order = this.column.isGroupSortedByMe().asc;

    const sortMethods = valueString.map((d) => {
      return `<label><input type="radio" name="multivaluesort" value="${d}"  ${(bak === d) ? 'checked' : ''} > ${d.slice(0, 1).toUpperCase() + d.slice(1)}</label><br>`;
    }).join('\n');
    const sortOrders = `
        <label><input type="radio" name="sortorder" value="asc"  ${(order === 'asc') ? 'checked' : ''} > Ascending</label><br>
        <label><input type="radio" name="sortorder" value="desc"  ${(order === 'desc') ? 'checked' : ''} > Decending</label><br>`;

    const popup = this.makeChoosePopup( `${sortMethods}<strong>Sort Order</strong><br>${sortOrders}`);

    Array.from(popup.querySelectorAll('input[name=multivaluesort]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => this.column.setSortMethod(<'name'|'count'>n.value));
    });
    Array.from(popup.querySelectorAll('input[name=sortorder]')).forEach((n: HTMLInputElement) => {
      n.addEventListener('change', () => {
        this.column.groupSortByMe(n.value === 'asc');
      });
    });

    return popup;
  }

}
