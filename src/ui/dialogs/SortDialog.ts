import type { Column } from '../../model';
import ADialog, { IDialogContext } from './ADialog';
import { uniqueId, forEach } from './utils';
import { getToolbarDialogAddons } from '../toolbarResolvers';
import type { IRankingHeaderContext, IToolbarDialogAddonHandler } from '../interfaces';
import { cssClass } from '../../styles';

/** @internal */
export default class SortDialog extends ADialog {
  private readonly handlers: IToolbarDialogAddonHandler[] = [];

  constructor(
    private readonly column: Column,
    private readonly groupSortBy: boolean,
    dialog: IDialogContext,
    private readonly ctx: IRankingHeaderContext
  ) {
    super(dialog, {
      livePreview: groupSortBy ? 'groupSort' : 'sort',
    });
  }

  protected build(node: HTMLElement) {
    const addons = getToolbarDialogAddons(this.column, this.groupSortBy ? 'sortGroup' : 'sort', this.ctx);
    for (const addon of addons) {
      const title = this.node.ownerDocument.createElement('strong');
      title.textContent = addon.title;
      this.node.insertAdjacentElement('beforeend', title);
      this.handlers.push(addon.append(this.column, this.node, this.dialog, this.ctx));
    }

    this.handlers.push(sortOrder(node, this.column, this.dialog.idPrefix, this.groupSortBy));

    for (const handler of this.handlers) {
      this.enableLivePreviews(handler.elems);
    }
  }

  protected submit() {
    for (const handler of this.handlers) {
      if (handler.submit() === false) {
        return false;
      }
    }
    return true;
  }

  protected cancel() {
    for (const handler of this.handlers) {
      handler.cancel();
    }
  }

  protected reset() {
    for (const handler of this.handlers) {
      handler.reset();
    }
  }
}

function sortOrder(
  node: HTMLElement,
  column: Column,
  idPrefix: string,
  groupSortBy = false
): IToolbarDialogAddonHandler {
  const ranking = column.findMyRanker()!;
  const current = groupSortBy ? ranking.getGroupSortCriteria() : ranking.getSortCriteria();
  const order = Object.assign({}, groupSortBy ? column.isGroupSortedByMe() : column.isSortedByMe());

  const priority = order.priority === undefined ? current.length : order.priority;

  const id = uniqueId(idPrefix);
  node.insertAdjacentHTML(
    'afterbegin',
    `
        <strong>Sort Order</strong>
        <label class="${cssClass('checkbox')}"><input type="radio" name="sortorder" value="asc"  ${
      order.asc === 'asc' ? 'checked' : ''
    } ><span>Ascending</span></label>
        <label class="${cssClass('checkbox')}"><input type="radio" name="sortorder" value="desc"  ${
      order.asc === 'desc' ? 'checked' : ''
    } ><span>Descending</span></label>
        <label class="${cssClass('checkbox')}"><input type="radio" name="sortorder" value="none"  ${
      order.asc === undefined ? 'checked' : ''
    } ><span>Unsorted</span></label>
        <strong>Sort Priority</strong>
        <input type="number" id="${id}P" step="1" min="1" max="${current.length + 1}" value="${priority + 1}">
    `
  );

  const updateDisabled = (disable: boolean) => {
    forEach(
      node,
      'input:not([name=sortorder]), select, textarea',
      (d: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
        d.disabled = disable;
      }
    );
  };
  updateDisabled(order.asc === undefined);

  forEach(node, 'input[name=sortorder]', (n: HTMLInputElement) => {
    n.addEventListener(
      'change',
      () => {
        updateDisabled(n.value === 'none');
      },
      {
        passive: true,
      }
    );
  });

  return {
    elems: `input[name=sortorder], #${id}P`,
    submit() {
      const asc = node.querySelector<HTMLInputElement>('input[name=sortorder]:checked')!.value;
      const priority = Number.parseInt(node.querySelector<HTMLInputElement>(`#${id}P`)!.value, 10) - 1;

      if (groupSortBy) {
        ranking.groupSortBy(column, asc === 'asc', asc === 'none' ? -1 : priority);
      } else {
        ranking.sortBy(column, asc === 'asc', asc === 'none' ? -1 : priority);
      }
      return true;
    },
    reset() {
      node.querySelector<HTMLInputElement>('input[name=sortorder][value=none]')!.checked = true;
      node.querySelector<HTMLInputElement>(`#${id}P`)!.value = (
        current.length + (order.priority === undefined ? 1 : 0)
      ).toString();
      updateDisabled(true);
    },
    cancel() {
      if (groupSortBy) {
        ranking.groupSortBy(column, order.asc === 'asc', order.asc === undefined ? -1 : order.priority);
      } else {
        ranking.sortBy(column, order.asc === 'asc', order.asc === undefined ? -1 : order.priority);
      }
    },
  };
}
