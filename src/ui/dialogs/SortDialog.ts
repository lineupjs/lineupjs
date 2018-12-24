import {Column} from '../../model';
import ADialog, {IDialogContext} from './ADialog';
import {uniqueId, forEach} from './utils';
import {getToolbarDialogAddons} from '../toolbar';
import {IRankingHeaderContext, IToolbarDialogAddon} from '../interfaces';
import {cssClass} from '../../styles';

/** @internal */
export default class SortDialog extends ADialog {
  private readonly addons: IToolbarDialogAddon[];

  constructor(private readonly column: Column, private readonly groupSortBy: boolean, dialog: IDialogContext, private readonly ctx: IRankingHeaderContext) {
    super(dialog);
    this.addons = getToolbarDialogAddons(this.column, groupSortBy ? 'sortGroup' : 'sort', ctx);
  }

  protected build(node: HTMLElement) {
    for(const addon of this.addons) {
      this.node.insertAdjacentHTML('beforeend', `<strong>${addon.title}</strong>`);
      addon.append(this.column, this.node, this.dialog, this.ctx);
    }

    sortOrder(node, this.column, this.dialog.idPrefix, this.groupSortBy);
  }
}

function sortOrder(node: HTMLElement, column: Column, idPrefix: string, groupSortBy: boolean = false) {
  const ranking = column.findMyRanker()!;
  const current = groupSortBy  ? ranking.getGroupSortCriteria() : ranking.getSortCriteria();
  const order = Object.assign({}, groupSortBy ? column.isGroupSortedByMe() : column.isSortedByMe());

  if (order.priority === undefined) {
    order.priority = current.length;
  }

  const id = uniqueId(idPrefix);
  node.insertAdjacentHTML('afterbegin', `
        <strong>Sort Order</strong>
        <label class="${cssClass('checkbox')}"><input type="radio" name="sortorder" value="asc"  ${(order.asc === 'asc') ? 'checked' : ''} ><span>Ascending</span></label>
        <label class="${cssClass('checkbox')}"><input type="radio" name="sortorder" value="desc"  ${(order.asc === 'desc') ? 'checked' : ''} ><span>Decending</span></label>
        <label class="${cssClass('checkbox')}"><input type="radio" name="sortorder" value="none"  ${(order.asc === undefined) ? 'checked' : ''} ><span>Unsorted</span></label>
        <strong>Sort Priority</strong>
        <input type="number" id="${id}P" step="1" min="1" max="${current.length + 1}" value="${order.priority + 1}">
    `);

  const updateDisabled = (disable: boolean) => {
    forEach(node, 'input:not([name=sortorder]), select, textarea', (d: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
      d.disabled = disable;
    });
  };
  updateDisabled(order.asc === undefined);

  const trigger = () => {
    if (groupSortBy) {
      ranking.groupSortBy(column, order.asc === 'asc', order.asc === undefined ? -1 : order.priority);
    } else {
      ranking.sortBy(column, order.asc === 'asc', order.asc === undefined ? -1 : order.priority);
    }

    updateDisabled(order.asc === undefined);
  };

  forEach(node, 'input[name=sortorder]', (n: HTMLInputElement) => {
    n.addEventListener('change', () => {
      order.asc = n.value === 'none' ? undefined : <'asc'|'desc'>n.value;
      trigger();
    }, {
      passive: true
    });
  });
  {
    const priority = (<HTMLInputElement>node.querySelector(`#${id}P`));
    priority.addEventListener('change', () => {
      order.priority = parseInt(priority.value, 10) - 1;
      trigger();
    }, {
      passive: true
    });
  }
}
