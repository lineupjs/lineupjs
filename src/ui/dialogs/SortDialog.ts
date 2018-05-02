import BoxPlotColumn from '../../model/BoxPlotColumn';
import Column from '../../model/Column';
import {EAdvancedSortMethod, ESortMethod, IBoxPlotColumn} from '../../model/INumberColumn';
import NumberColumn from '../../model/NumberColumn';
import ADialog, {IDialogContext} from './ADialog';
import {randomId, forEach} from './utils';

/** @internal */
export default class SortDialog extends ADialog {
  constructor(private readonly column: (IBoxPlotColumn | NumberColumn), dialog: IDialogContext) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    sortMethods(node, this.column, Object.keys(this.column instanceof BoxPlotColumn ? ESortMethod : EAdvancedSortMethod), this.dialog.idPrefix);
    sortOrder(node, this.column, this.dialog.idPrefix, this.column instanceof NumberColumn);
  }
}

/** @internal */
export function sortMethods(node: HTMLElement, column: {setSortMethod(v: string): void, getSortMethod(): string}, methods: string[], idPrefix: string) {
  const id = randomId(idPrefix);
  const bak = column.getSortMethod();
  methods.forEach((d) => node.insertAdjacentHTML('beforeend', `<div class="checkbox"><input id="${id}${d}" type="radio" name="multivaluesort" value="${d}"  ${(bak === d) ? 'checked' : ''} ><label for="${id}${d}">${d.slice(0, 1).toUpperCase() + d.slice(1)}</label></div>`));

  forEach(node, 'input[name=multivaluesort]', (n: HTMLInputElement) => {
    n.addEventListener('change', () => column.setSortMethod(n.value), {
      passive: true
    });
  });
}

/** @internal */
export function sortOrder(node: HTMLElement, column: Column, idPrefix: string, groupSortBy: boolean = false) {
  const order = groupSortBy ? column.isGroupSortedByMe().asc : column.isSortedByMe().asc;
  const id = randomId(idPrefix);
  node.insertAdjacentHTML('beforeend', `
        <strong>Sort Order</strong>
        <div class="lu-checkbox"><input id="${id}A" type="radio" name="sortorder" value="asc"  ${(order === 'asc') ? 'checked' : ''} ><label for="${id}A">Ascending</label></div>
        <div class="lu-checkbox"><input id="${id}A" type="radio" name="sortorder" value="desc"  ${(order === 'desc') ? 'checked' : ''} ><label for="${id}B">Decending</label></div>
    `);
  forEach(node, 'input[name=sortorder]', (n: HTMLInputElement) => {
    n.addEventListener('change', () => {
      if (groupSortBy) {
        column.groupSortByMe(n.value === 'asc');
      } else {
        column.sortByMe(n.value === 'asc');
      }
    }, {
      passive: true
    });
  });
}
