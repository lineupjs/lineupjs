import LinkColumn from '../model/LinkColumn';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {clipText, showOverlay} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';


export default class LinkCellRenderer implements ICellRendererFactory {
  createDOM(col: LinkColumn): IDOMCellRenderer {
    return {
      template: `<div class='link text'></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        n.innerHTML = col.isLink(d.v, d.dataIndex) ? `<a class="link" href="${col.getValue(d.v, d.dataIndex)}" target="_blank">${col.getLabel(d.v, d.dataIndex)}</a>` : col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: LinkColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, _i: number, dx: number, dy: number) => {
      const isLink = col.isLink(d.v, d.dataIndex);
      if (!isLink) {
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 0, 0, context.colWidth(col), context.textHints);
        return;
      }
      const hovered = context.hovered(d.dataIndex);
      if (hovered) {
        const overlay = showOverlay(context.bodyDOMElement, context.idPrefix + col.id, dx, dy);
        overlay.style.width = `${context.colWidth(col)}px`;
        overlay.innerHTML = `<a class='link' href='${col.getValue(d.v, d.dataIndex)}' target='_blank'>${col.getLabel(d.v, d.dataIndex)}</a>`;
      } else {
        const bak = ctx.fillStyle;
        ctx.fillStyle = context.option('style.link', context.option('style.text', 'black'));
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 0, 0, context.colWidth(col), context.textHints);
        ctx.fillStyle = bak;
      }
    };
  }
}
