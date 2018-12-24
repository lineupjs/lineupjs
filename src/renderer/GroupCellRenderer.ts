import {Column, GroupColumn, IOrderedGroup} from '../model';
import {ICellRendererFactory} from './interfaces';
import {noRenderer} from './utils';

/** @internal */
export default class GroupCellRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof GroupColumn;
  }

  create() {
    return noRenderer;
  }

  createGroup() {
    return {
      template: `<div><div></div></div>`,
      update(node: HTMLElement, group: IOrderedGroup) {
        (<HTMLElement>node.firstElementChild!).textContent = `${group.name} (${group.order.length})`;
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
