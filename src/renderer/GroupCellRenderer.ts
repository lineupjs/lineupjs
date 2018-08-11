import {IDataRow, IGroup, IGroupMeta} from '../model';
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
      update(node: HTMLElement, _row: IDataRow, i: number, group: IGroup) {
        const p = (<HTMLElement>node.firstElementChild!);
        if (i !== 0) {
          p.textContent = '';
        } else if (Array.isArray((<any>group).order)) {
          p.textContent = `${group.name} (${(<any>group).order.length})`;
        } else {
          p.textContent = group.name;
        }
      },
      render: (_ctx: CanvasRenderingContext2D, _row: IDataRow, _i: number, _group: IGroup, meta: IGroupMeta) => Boolean(meta)
    };
  }

  createGroup() {
    return {
      template: `<div><div></div></div>`,
      update(node: HTMLElement, group: IGroup, rows: IDataRow[]) {
        (<HTMLElement>node.firstElementChild!).textContent = `${group.name} (${rows.length})`;
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
