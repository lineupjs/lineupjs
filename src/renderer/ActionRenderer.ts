import Column from '../model/Column';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {forEachChild, showOverlay} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import ICellRendererFactory from './ICellRendererFactory';


export default class ActionRenderer implements ICellRendererFactory {
  createDOM(col: Column, context: IDOMRenderContext): IDOMCellRenderer {
    const actions = <{ name: string, icon: string, action(v: any, rowIndex: number): void }[]>context.option('actions', []);
    return {
      template: `<div class='actions hoverOnly'>${actions.map((a) => `<span title='${a.name}' class='fa'>${a.icon}</span>`).join('')}</div>`,
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

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const actions = <{ name: string, icon: string, action(v: any, rowIndex: number): void }[]>context.option('actions', []);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number) => {
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
