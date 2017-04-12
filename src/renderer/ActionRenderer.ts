import Column from '../model/Column';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer, IHTMLCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {forEach, showOverlay} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import ICellRendererFactory from './ICellRendererFactory';


export default class ActionRenderer implements ICellRendererFactory {
  createSVG(col: Column, context: IDOMRenderContext): ISVGCellRenderer {
    const actions = context.option('actions', []);
    return {
      template: `<text class='actions hoverOnly fa'>${actions.map((a) => `<tspan>${a.icon}</tspan>`).join('')}</text>`,
      update: (n: SVGTextElement, d: IDataRow) => {
        forEach(n, 'tspan', (ni: SVGTSpanElement, i: number) => {
          ni.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            actions[i].action(d.v, d.dataIndex);
          };
        });
      }
    };
  }

  createHTML(col: Column, context: IDOMRenderContext): IHTMLCellRenderer {
    const actions = context.option('actions', []);
    return {
      template: `<div class='actions hoverOnly'>${actions.map((a) => `<span title='${a.name}' class='fa'>${a.icon}</span>`).join('')}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        forEach(n, 'span', (ni: HTMLSpanElement, i: number) => {
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
    const actions = context.option('actions', []);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number) => {
      const hovered = context.hovered(d.dataIndex);
      if (hovered) {
        const overlay = showOverlay(context.bodyDOMElement, context.idPrefix + col.id, dx, dy);
        overlay.style.width = col.getWidth() + 'px';
        overlay.classList.add('actions');
        overlay.innerHTML = actions.map((a) => `<span title='${a.name}' class='fa'>${a.icon}</span>`).join('');
        forEach(overlay, 'span', (ni: HTMLSpanElement, i) => {
          ni.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            actions[i].action(d.v, d.dataIndex);
          };
        });
      }
    };
  }
}
