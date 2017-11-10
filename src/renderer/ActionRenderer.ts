import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {forEachChild, showOverlay} from '../utils';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import ICellRendererFactory from './ICellRendererFactory';
import {default as ActionColumn, IAction, IGroupAction} from '../model/ActionColumn';
import {IGroup} from '../model/Group';
import Column from '../model/Column';


export default class ActionRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof ActionColumn;
  }

  createDOM(col: ActionColumn, context: IDOMRenderContext): IDOMCellRenderer {
    const actions = (<IAction[]>context.option('actions', [])).concat(col.actions);
    return {
      template: `<div class='actions lu-hover-only'>${actions.map((a) => `<span title='${a.name}' class='fa'>${a.icon}</span>`).join('')}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        forEachChild(n, (ni: HTMLSpanElement, i: number) => {
          ni.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            actions[i].action(d.v, d.dataIndex);
          };
        });
      }
    };
  }

  createGroupDOM(col: ActionColumn, context: IDOMRenderContext): IDOMGroupRenderer {
    const actions = (<IGroupAction[]>context.option('groupActions', [])).concat(col.groupActions);
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

  createCanvas(col: ActionColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    const actions = (<IAction[]>context.option('actions', [])).concat(col.actions);
    return (_ctx: CanvasRenderingContext2D, d: IDataRow, _i: number, dx: number, dy: number) => {
      const hovered = context.hovered(d.dataIndex);
      if (!hovered) {
        return;
      }
      const overlay = showOverlay(context.bodyDOMElement, context.idPrefix + col.id, dx, dy);
      overlay.style.width = `${context.colWidth(col)}px`;
      overlay.classList.add('actions');
      overlay.innerHTML = actions.map((a) => `<span title='${a.name}' class='fa'>${a.icon}</span>`).join('');
      forEachChild(overlay, (ni: HTMLSpanElement, i) => {
        ni.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          actions[i].action(d.v, d.dataIndex);
        };
      });
    };
  }

  createGroupCanvas(col: ActionColumn, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const actions = (<IGroupAction[]>context.option('groupActions', [])).concat(col.groupActions);
    return (_ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[], dx: number, dy: number) => {
      const hovered = context.groupHovered(group);
      if (!hovered) {
        return;
      }
      const overlay = showOverlay(context.bodyDOMElement, context.idPrefix + col.id, dx, dy);
      overlay.style.width = `${context.colWidth(col)}px`;
      overlay.classList.add('actions');
      overlay.innerHTML = actions.map((a) => `<span title='${a.name}' class='fa'>${a.icon}</span>`).join('');
      forEachChild(overlay, (ni: HTMLSpanElement, i) => {
        ni.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          actions[i].action(group, rows);
        };
      });
    };
  }
}
