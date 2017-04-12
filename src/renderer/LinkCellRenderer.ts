import LinkColumn from '../model/LinkColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer, IHTMLCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {clipText, showOverlay} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';


export default class LinkCellRenderer implements ICellRendererFactory {
  createSVG(col: LinkColumn, context: IDOMRenderContext): ISVGCellRenderer {
    return {
      template: `<text class='link text' clip-path='url(#cp${context.idPrefix}clipCol${col.id})'></text>`,
      update: (n: SVGTextElement, d: IDataRow) => {
        n.innerHTML = col.isLink(d.v, d.dataIndex) ? `<a class='link' xlink:href='${col.getValue(d.v, d.dataIndex)}' target='_blank'>${col.getLabel(d.v, d.dataIndex)}</a>` : col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createHTML(col: LinkColumn): IHTMLCellRenderer {
    return {
      template: `<div class='link text'></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        n.style.width = col.getWidth() + 'px';
        n.innerHTML = col.isLink(d.v, d.dataIndex) ? `<a class='link' href='${col.getValue(d.v, d.dataIndex)}' target='_blank'>${col.getLabel(d.v, d.dataIndex)}</a>` : col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: LinkColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number) => {
      const isLink = col.isLink(d.v, d.dataIndex);
      if (!isLink) {
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 0, 0, col.getWidth(), context.textHints);
        return;
      }
      const hovered = context.hovered(d.dataIndex);
      if (hovered) {
        const overlay = showOverlay(context.bodyDOMElement, context.idPrefix + col.id, dx, dy);
        overlay.style.width = col.getWidth() + 'px';
        overlay.innerHTML = `<a class='link' href='${col.getValue(d.v, d.dataIndex)}' target='_blank'>${col.getLabel(d.v, d.dataIndex)}</a>`;
      } else {
        const bak = ctx.fillStyle;
        ctx.fillStyle = context.option('style.link', context.option('style.text', 'black'));
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 0, 0, col.getWidth(), context.textHints);
        ctx.fillStyle = bak;
      }
    };
  }
}
