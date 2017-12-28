import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../model/interfaces';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {clipText} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';
import {ANoGroupRenderer} from './ANoGroupRenderer';
import LinkColumn from '../model/LinkColumn';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import Column from '../model/Column';

export default class ImageCellRenderer extends ANoGroupRenderer implements ICellRendererFactory {

  private readonly imageCache = new Map<string, HTMLImageElement>();

  readonly title = 'Image';

  canRender(col: Column) {
    return col instanceof LinkColumn;
  }

  private getImage(col: LinkColumn, row: IDataRow) {
    if (!col.isLink(row)) {
      return null;
    }
    const url = col.getValue(row);
    if (!this.imageCache.has(url)) {
      // start loading
      const image = new Image();
      image.src = url;
      this.imageCache.set(url, image);
    }
    return this.imageCache.get(url)!;
  }

  createDOM(col: LinkColumn): IDOMCellRenderer {
    return {
      template: `<div></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        n.title = col.getLabel(d);
        n.style.backgroundImage = missing || !col.isLink(d) ? null : `url('${col.getValue(d)}')`;
      }
    };
  }

  createCanvas(col: LinkColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }
      const isLink = col.isLink(d);
      if (!isLink) {
        clipText(ctx, col.getLabel(d), 0, 0, context.colWidth(col), context.textHints);
        return;
      }
      const image = this.getImage(col, d);
      if (!image) {
        return;
      }
      const iw = image.width;
      const ih = image.height;
      if (iw === 0 || ih === 0) {
        return;
      }
      const w = context.colWidth(col);
      const h = context.rowHeight(i);
      const factor = Math.min(w / iw, h / ih);
      const rw = iw * factor;
      const rh = ih * factor;
      ctx.drawImage(image, (w - rw)/2, (h - rh)/2, rw, rh);
    };
  }
}
