import LinkColumn from '../model/LinkColumn';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../model/interfaces';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {clipText, showOverlay} from './utils';
import ICellRendererFactory from './ICellRendererFactory';
import {ANoGroupRenderer} from './ANoGroupRenderer';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import Column from '../model/Column';


export default class LinkCellRenderer extends ANoGroupRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof LinkColumn;
  }

  createDOM(col: LinkColumn): IDOMCellRenderer {
    return {
      template: `<div class='link text'></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        n.innerHTML = col.isLink(d) ? `<a class="link" href="${col.getValue(d)}" target="_blank">${col.getLabel(d)}</a>` : col.getLabel(d);
      }
    };
  }

  createCanvas(col: LinkColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number) => {
      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }
      const isLink = col.isLink(d);
      if (!isLink) {
        clipText(ctx, col.getLabel(d), 0, 0, context.colWidth(col), context.textHints);
        return;
      }
      const hovered = context.hovered(d.dataIndex);
      if (hovered) {
        const overlay = showOverlay(context.bodyDOMElement, context.idPrefix + col.id, dx, dy);
        overlay.style.width = `${context.colWidth(col)}px`;
        overlay.innerHTML = `<a class='link' href='${col.getValue(d)}' target='_blank'>${col.getLabel(d)}</a>`;
      } else {
        const bak = ctx.fillStyle;
        ctx.fillStyle = context.option('style.link', context.option('style.text', 'black'));
        clipText(ctx, col.getLabel(d), 0, 0, context.colWidth(col), context.textHints);
        ctx.fillStyle = bak;
      }
    };
  }
}
