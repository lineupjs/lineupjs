import {Column, GroupColumn, IOrderedGroup, IGroup, defaultGroup, IDataRow} from '../model';
import {ICellRendererFactory} from './interfaces';
import {noRenderer} from './utils';


function isDummyGroup(group: IGroup) {
  return group.parent == null && group.name === defaultGroup.name;
}

/** @internal */
export default class GroupCellRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof GroupColumn;
  }

  create() {
    return {
      template: `<div><div></div></div>`,
      update(node: HTMLElement, _row: IDataRow, i: number, group: IOrderedGroup) {
        (<HTMLElement>node.firstElementChild!).textContent = isDummyGroup(group) || i > 0 ? '' : `${group.name} (${group.order.length})`;
      },
      render(_ctx: CanvasRenderingContext2D, _row: IDataRow, i: number) {
        return i === 0;
      }
    };
  }

  createGroup() {
    return {
      template: `<div><div></div></div>`,
      update(node: HTMLElement, group: IOrderedGroup) {
        (<HTMLElement>node.firstElementChild!).textContent = isDummyGroup(group) ? '' : `${group.name} (${group.order.length})`;
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
