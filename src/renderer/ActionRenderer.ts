import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {forEachChild, showOverlay} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import ICellRendererFactory from './ICellRendererFactory';
import {default as ActionColumn, IAction} from '../model/ActionColumn';


export default class ActionRenderer implements ICellRendererFactory {
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
}
