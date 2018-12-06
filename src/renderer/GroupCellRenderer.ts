import {IDataRow, IGroup, IGroupMeta, IOrderedGroup} from '../model';
import Column from '../model/Column';
import GroupColumn from '../model/GroupColumn';
import {ICellRendererFactory} from './interfaces';
import {noRenderer} from './utils';

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
        const p = (<HTMLElement>node.firstElementChild!);
        if (i !== 0) {
          p.textContent = '';
        } else {
          p.textContent = `${group.name} (${group.order.length})`;
        }
      },
      render: (_ctx: CanvasRenderingContext2D, _row: IDataRow, _i: number, _group: IGroup, meta: IGroupMeta) => meta != null
    };
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
