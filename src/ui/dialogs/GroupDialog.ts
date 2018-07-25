import Column from '../../model/Column';
import ADialog, {IDialogContext} from './ADialog';
import {uniqueId, forEach} from './utils';
import {getToolbarDialogAddons, IToolbarDialogAddon} from '../toolbar';
import {IRankingHeaderContext} from '../interfaces';
import {cssClass} from '../../styles';

/** @internal */
export default class GroupDialog extends ADialog {
  private readonly addons: IToolbarDialogAddon[];

  constructor(private readonly column: Column, dialog: IDialogContext, private readonly ctx: IRankingHeaderContext) {
    super(dialog);
    this.addons = getToolbarDialogAddons(this.column, 'group', ctx);
  }

  protected build(node: HTMLElement) {
    for(const addon of this.addons) {
      this.node.insertAdjacentHTML('beforeend', `<strong>${addon.title}</strong>`);
      addon.append(this.column, this.node, this.dialog, this.ctx);
    }

    sortOrder(node, this.column, this.dialog.idPrefix);
  }
}

function sortOrder(node: HTMLElement, column: Column, idPrefix: string) {
  const ranking = column.findMyRanker()!;
  const current = ranking.getGroupCriteria();
  let order = current.indexOf(column);
  let enabled = order >= 0;

  if (order < 0) {
    order = current.length;
  }

  const id = uniqueId(idPrefix);
  node.insertAdjacentHTML('afterbegin', `
        <strong>Group By</strong>
        <div class="${cssClass('checkbox')}"><input id="${id}B" type="radio" name="grouped" value="true" ${enabled ? 'checked' : ''} ><label for="${id}B">Enabled</label></div>
        <div class="${cssClass('checkbox')}"><input id="${id}N" type="radio" name="grouped" value="false" ${!enabled ? 'checked' : ''} ><label for="${id}N">Disabled</label></div>
        <strong>Group Priority</strong>
        <input type="number" id="${id}P" step="1" min="1" max="${current.length + 1}" value="${order + 1}">
    `);

  const updateDisabled = (disable: boolean) => {
    forEach(node, 'input:not([name=grouped]), select, textarea', (d: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
      d.disabled = disable;
    });
  };
  updateDisabled(!enabled);

  const trigger = () => {
    ranking.groupBy(column, !enabled ? -1 : order);
    updateDisabled(!enabled);
  };

  forEach(node, 'input[name=grouped]', (n: HTMLInputElement) => {
    n.addEventListener('change', () => {
      enabled = n.value === 'true';
      trigger();
    }, {
      passive: true
    });
  });
  {
    const priority = (<HTMLInputElement>node.querySelector(`#${id}P`));
    priority.addEventListener('change', () => {
      order = parseInt(priority.value, 10) - 1;
      trigger();
    }, {
      passive: true
    });
  }
}
