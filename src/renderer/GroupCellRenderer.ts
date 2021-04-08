import { Column, GroupColumn, IOrderedGroup, IGroup, defaultGroup, IDataRow } from '../model';
import type { ICellRendererFactory, ICellRenderer, IGroupCellRenderer, ISummaryRenderer } from './interfaces';
import { noRenderer } from './utils';

function isDummyGroup(group: IGroup) {
  return group.parent == null && group.name === defaultGroup.name;
}

export default class GroupCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Default';

  canRender(col: Column): boolean {
    return col instanceof GroupColumn;
  }

  create(): ICellRenderer {
    return {
      template: `<div><div></div></div>`,
      update(node: HTMLElement, _row: IDataRow, i: number, group: IOrderedGroup) {
        const text = isDummyGroup(group) || i > 0 ? '' : `${group.name} (${group.order.length})`;
        (node.firstElementChild! as HTMLElement).textContent = text;
        node.title = text;
      },
      render(_ctx: CanvasRenderingContext2D, _row: IDataRow, i: number) {
        return i === 0;
      },
    };
  }

  createGroup(): IGroupCellRenderer {
    return {
      template: `<div><div></div></div>`,
      update(node: HTMLElement, group: IOrderedGroup) {
        const text = isDummyGroup(group) ? '' : `${group.name} (${group.order.length})`;
        (node.firstElementChild! as HTMLElement).textContent = text;
        node.title = text;
      },
    };
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
