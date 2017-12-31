import {forEachChild, noop} from './utils';
import {default as ActionColumn} from '../model/ActionColumn';
import {IGroup, IDataRow} from '../model';
import Column from '../model/Column';
import {ICellRendererFactory} from './interfaces';


export default class ActionRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof ActionColumn;
  }

  create(col: ActionColumn) {
    const actions = col.actions;
    return {
      template: `<div class='actions lu-hover-only'>${actions.map((a) => `<span title='${a.name}' class='fa'>${a.icon}</span>`).join('')}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        forEachChild(n, (ni: HTMLSpanElement, i: number) => {
          ni.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            actions[i].action(d);
          };
        });
      },
      render: noop
    };
  }

  createGroup(col: ActionColumn) {
    const actions = col.groupActions;
    return {
      template: `<div class='actions lu-hover-only'>${actions.map((a) => `<span title='${a.name}' class='fa'>${a.icon}</span>`).join('')}</div>`,
      update: (n: HTMLElement, group: IGroup, rows: IDataRow[]) => {
        forEachChild(n, (ni: HTMLSpanElement, i: number) => {
          ni.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            actions[i].action(group, rows);
          };
        });
      }
    };
  }
}
