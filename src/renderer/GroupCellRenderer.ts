import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import GroupColumn from '../model/GroupColumn';
import {ICellRendererFactory} from './interfaces';
import {noop} from './utils';

/**
 * renders a string with additional alignment behavior
 * one instance factory shared among strings
 */
export default class GroupCellRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof GroupColumn;
  }

  create() {
    return {
      template: `<div><div></div></div>`,
      update(node: HTMLElement, _row: IDataRow, i: number, group: IGroup) {
        (<HTMLElement>node.firstElementChild!).innerText = i === 0 ? group.name : '';
      },
      render: noop
    };
  }

  createGroup() {
    return {
      template: `<div><div></div></div>`,
      update(node: HTMLElement, group: IGroup, rows: IDataRow[]) {
        (<HTMLElement>node.firstElementChild!).innerText = `${group.name} (${rows.length})`;
      }
    };
  }
}
