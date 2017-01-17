import Column from '../model/Column';
import ICellRendererFactory from './ICellRendererFactory';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer, IHTMLCellRenderer} from './IDOMCellRenderers';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {IDataRow} from '../provider/ADataProvider';
import {attr, clipText} from '../utils';

/**
 * default renderer instance rendering the value as a text
 */
export class DefaultCellRenderer implements ICellRendererFactory {

  /**
   * @param textClass {string} class to append to the text elements
   * @param align {string} the text alignment: left, center, right
   */
  constructor(private readonly textClass: string = 'text', private readonly align: string = 'left') {
    this.textClass = textClass;
    this.align = align;
  }

  createSVG(col: Column, context: IDOMRenderContext): ISVGCellRenderer {
    return {
      template: `<text class="${this.textClass}" clip-path="url(#cp${context.idPrefix}clipCol${col.id})"></text>`,
      update: (n: SVGTextElement, d: IDataRow) => {
        let alignmentShift = 2;
        if (this.align === 'right') {
          alignmentShift = col.getWidth() - 5;
        } else if (this.align === 'center') {
          alignmentShift = col.getWidth() * 0.5;
        }
        attr(n, {
          x: alignmentShift
        });
        n.textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createHTML(col: Column, context: IDOMRenderContext): IHTMLCellRenderer {
    return {
      template: `<div class="${this.textClass} ${this.align}"></div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        attr(n, {}, {
          width: `${col.getWidth()}px`
        });
        n.textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow) => {
      const bak = ctx.textAlign;
      ctx.textAlign = this.align;
      const w = col.getWidth();
      let shift = 0;
      if (this.align === 'center') {
        shift = w / 2;
      } else if (this.align === 'right') {
        shift = w;
      }
      clipText(ctx, col.getLabel(d.v, d.dataIndex), shift, 0, w, context.textHints);
      ctx.textAlign = bak;
    };
  }
}
