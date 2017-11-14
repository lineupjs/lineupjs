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
  constructor(private readonly textClass: string = 'text', private readonly align: string = 'left') {
  }

  canRender(_col: Column) {
    return true;
  }

  createDOM(col: Column): IDOMCellRenderer {
    return {
      template: `<div class="${this.textClass} ${this.align}"> </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        setText(n, col.getLabel(d.v, d.dataIndex));
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

  private static exampleText(col: Column, rows: IDataRow[]) {
    const numExampleRows = 5;
    let examples = rows
      .slice(0, numExampleRows)
      .map((r) => col.getLabel(r.v, r.dataIndex))
      .join(', ');

    if(rows.length > numExampleRows) {
      examples += ', &hellip;';
    }
    return examples;
  }

  createGroupDOM(col: Column): IDOMGroupRenderer {
    return {
      template: `<div class="${this.textClass} ${this.align}"> </div>`,
      update: (n: HTMLDivElement, group: IGroup, rows: IDataRow[]) => {
        n.innerHTML = `
            ${group.name} (${rows.length})
            <div>${DefaultCellRenderer.exampleText(col, rows)}</div>
        `;
      }
    };
  }

  createGroupCanvas(col: Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const w = context.colWidth(col);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      clipText(ctx, `${group.name} (${rows.length})`, 0, 2, w, context.textHints);
      const bak = ctx.font;
      ctx.font = '8pt "Helvetica Neue", Helvetica, Arial, sans-serif';
      clipText(ctx, DefaultCellRenderer.exampleText(col, rows), 0, 2 + 12, w, context.textHints);
      ctx.font = bak;
    };
  }
}
