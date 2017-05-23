import ICellRendererFactory from './ICellRendererFactory';
import CategoricalColumn from '../model/CategoricalColumn';
import Column from '../model/Column';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer, IHTMLCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr, clipText} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';

/**
 * renders categorical columns as a colored rect with label
 */
export default class CategoricalCellRenderer implements ICellRendererFactory {
  /**
   * class to append to the text elements
   * @type {string}
   */

  constructor(private readonly textClass: string = 'cat') {
    this.textClass = textClass;
  }

  createSVG(col: CategoricalColumn, context: IDOMRenderContext): ISVGCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return {
      template: `<g class='${this.textClass}'>
        <text clip-path='url(#cp${context.idPrefix}clipCol${col.id})'></text>
        <rect y='${padding}'></rect>
      </g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        let cell: number;
        if (col.getCompressed()) {
          cell = Math.min(Column.COMPRESSED_WIDTH - padding * 2, Math.max(context.rowHeight(i) - padding * 2, 0));
        } else {
          cell = Math.min(col.getWidth() * 0.3, Math.max(context.rowHeight(i) - padding * 2, 0));
        }
        attr(<SVGRectElement>n.querySelector('rect'), {
          width: cell,
          height: cell
        }, {
          fill: col.getColor(d.v, d.dataIndex)
        });
        attr(<SVGTextElement>n.querySelector('text'), {
          x: cell + padding * 2
        }).textContent = col.getCompressed() ? '' : col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createHTML(col: CategoricalColumn, context: IDOMRenderContext): IHTMLCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return {
      template: `<div class='${this.textClass}'>
        <div></div>
        <span></span>
      </div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        let cell: number;
        if (col.getCompressed()) {
          cell = Math.min(Column.COMPRESSED_WIDTH - padding * 2, Math.max(context.rowHeight(i) - padding * 2, 0));
        } else {
          cell = Math.min(col.getWidth() * 0.3, Math.max(context.rowHeight(i) - padding * 2, 0));
        }
        attr(n, {}, {
          width: `${col.getCompressed() ? Column.COMPRESSED_WIDTH : col.getWidth()}px`
        });
        attr(<HTMLDivElement>n.querySelector('div'), {}, {
          width: cell + 'px',
          height: cell + 'px',
          'background-color': col.getColor(d.v, d.dataIndex)
        });
        attr(<HTMLSpanElement>n.querySelector('span'), {}).textContent = col.getCompressed() ? '' : col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: CategoricalColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      ctx.fillStyle = col.getColor(d.v, d.dataIndex);
      if (col.getCompressed()) {
        const cell = Math.min(Column.COMPRESSED_WIDTH - padding * 2, Math.max(context.rowHeight(i) - padding * 2, 0));
        ctx.fillRect(padding, padding, cell, cell);
      } else {
        const cell = Math.min(col.getWidth() * 0.3, Math.max(context.rowHeight(i) - padding * 2, 0));
        ctx.fillRect(0, 0, cell, cell);
        ctx.fillStyle = context.option('style.text', 'black');
        clipText(ctx, col.getLabel(d.v, d.dataIndex), cell + 2, 0, col.getWidth() - cell - 2, context.textHints);
      }
    };
  }
}
