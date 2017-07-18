import ICellRendererFactory from './ICellRendererFactory';
import {ICategoricalColumn} from '../model/CategoricalColumn';
import Column from '../model/Column';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
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

  createDOM(col: ICategoricalColumn & Column, context: IDOMRenderContext): IDOMCellRenderer {
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
          cell = Math.min(col.getActualWidth() * 0.3, Math.max(context.rowHeight(i) - padding * 2, 0));
        }
        attr(<HTMLDivElement>n.firstElementChild, {}, {
          width: cell + 'px',
          height: cell + 'px',
          'background-color': col.getColor(d.v, d.dataIndex)
        });
        attr(<HTMLSpanElement>n.lastElementChild, {}, {}, col.getCompressed() ? '' : col.getLabel(d.v, d.dataIndex));
      }
    };
  }

  createCanvas(col: ICategoricalColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      ctx.fillStyle = col.getColor(d.v, d.dataIndex);
      if (col.getCompressed()) {
        const cell = Math.min(Column.COMPRESSED_WIDTH - padding * 2, Math.max(context.rowHeight(i) - padding * 2, 0));
        ctx.fillRect(padding, padding, cell, cell);
      } else {
        const cell = Math.min(col.getActualWidth() * 0.3, Math.max(context.rowHeight(i) - padding * 2, 0));
        ctx.fillRect(0, 0, cell, cell);
        ctx.fillStyle = context.option('style.text', 'black');
        clipText(ctx, col.getLabel(d.v, d.dataIndex), cell + 2, 0, col.getWidth() - cell - 2, context.textHints);
      }
    };
  }
}
