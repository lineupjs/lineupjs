import Column from '../model/Column';
import ICellRendererFactory from './ICellRendererFactory';
import {ICanvasRenderContext} from './RendererContexts';
import {IDOMCellRenderer, IDOMGroupRenderer} from './IDOMCellRenderers';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IDataRow} from '../provider/ADataProvider';
import {clipText, setText} from '../utils';
import {IGroup} from '../model/Group';
import {renderMissingCanvas, renderMissingDOM} from './missing';

/**
 * default renderer instance rendering the value as a text
 */
export class DefaultCellRenderer implements ICellRendererFactory {
  title = 'String';
  /**
   * @param textClass {string} class to append to the text elements
   * @param align {string} the text alignment: left, center, right
   */
  constructor(private readonly textClass: string = 'text', private readonly align: string = 'left', private readonly escape = true) {
  }

  canRender(_col: Column) {
    return true;
  }

  createDOM(col: Column): IDOMCellRenderer {
    return {
      template: `<div class="${this.textClass} ${this.align}"> </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        if (this.escape) {
          setText(n, col.getLabel(d.v, d.dataIndex));
        } else {
          n.innerHTML = col.getLabel(d.v, d.dataIndex);
        }
      }
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }
      const bak = ctx.textAlign;
      ctx.textAlign = this.align;
      const w = context.colWidth(col);
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

  createGroupDOM(_col: Column): IDOMGroupRenderer {
    return {
      template: `<div class="${this.textClass} ${this.align}"> </div>`,
      update: (n: HTMLDivElement, _group: IGroup, ) => {
        n.innerHTML = `No summary available`;
      }
    };
  }

  createGroupCanvas(col: Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const w = context.colWidth(col);
    return (ctx: CanvasRenderingContext2D, _group: IGroup) => {
      clipText(ctx, 'No summary available', 0, 2, w, context.textHints);
    };
  }
}
