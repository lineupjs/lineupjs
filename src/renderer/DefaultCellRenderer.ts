import Column from '../model/Column';
import ICellRendererFactory from './ICellRendererFactory';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {IDataRow} from '../provider/ADataProvider';
import {clipText, setText} from '../utils';

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

  createDOM(col: Column, context: IDOMRenderContext): IDOMCellRenderer {
    return {
      template: `<div class="${this.textClass} ${this.align}"> </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        setText(n, col.getLabel(d.v, d.dataIndex));
      }
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow) => {
      const bak = ctx.textAlign;
      ctx.textAlign = this.align;
      const w = col.getActualWidth();
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
