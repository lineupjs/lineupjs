import BoxPlotColumn from '../../model/BoxPlotColumn';
import Column from '../../model/Column';
import {EAdvancedSortMethod, ESortMethod, IBoxPlotColumn} from '../../model/INumberColumn';
import NumberColumn from '../../model/NumberColumn';
import ADialog, {IDialogContext} from './ADialog';

/** @internal */
export default class SortDialog extends ADialog {
  constructor(private readonly column: (IBoxPlotColumn | NumberColumn), dialog: IDialogContext) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    sortMethods(node, this.column, Object.keys(this.column instanceof BoxPlotColumn ? ESortMethod : EAdvancedSortMethod));
    sortOrder(node, this.column, this.column instanceof NumberColumn);
  }
}

/** @internal */
export function sortMethods(node: HTMLElement, column: { setSortMethod(v: string): void, getSortMethod(): string }, methods: string[]) {

  const bak = column.getSortMethod();
  methods.forEach((d) => node.insertAdjacentHTML('beforeend', `<label><input type="radio" name="multivaluesort" value="${d}"  ${(bak === d) ? 'checked' : ''} > ${d.slice(0, 1).toUpperCase() + d.slice(1)}</label>`));

  Array.from(node.querySelectorAll('input[name=multivaluesort]')).forEach((n: HTMLInputElement) => {
    n.addEventListener('change', () => column.setSortMethod(n.value));
  });
}

/** @internal */
export function sortOrder(node: HTMLElement, column: Column, groupSortBy: boolean = false) {
  const order = groupSortBy ? column.isGroupSortedByMe().asc : column.isSortedByMe().asc;

  node.insertAdjacentHTML('beforeend', `
        <strong>Sort Order</strong>
        <label><input type="radio" name="sortorder" value="asc"  ${(order === 'asc') ? 'checked' : ''} > Ascending</label>
        <label><input type="radio" name="sortorder" value="desc"  ${(order === 'desc') ? 'checked' : ''} > Decending</label>
    `);
  Array.from(node.querySelectorAll('input[name=sortorder]')).forEach((n: HTMLInputElement) => {
    n.addEventListener('change', () => {
      if (groupSortBy) {
        column.groupSortByMe(n.value === 'asc');
      } else {
        column.sortByMe(n.value === 'asc');
      }
    });
  });
}
