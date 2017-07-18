import ICellRendererFactory from './ICellRendererFactory';
import Column from '../model/Column';
import {INumberColumn} from '../model/NumberColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr, clipText} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class BarCellRenderer implements ICellRendererFactory {
  /**
   * flag to always render the value
   * @type {boolean}
   */

  constructor(private readonly renderValue: boolean = false, private colorOf: (d: any, i: number, col: Column) => string = (d, i, col) => col.color) {
  }

  createDOM(col: INumberColumn & Column, context: IDOMRenderContext): IDOMCellRenderer {
    const paddingTop = context.option('rowBarTopPadding', context.option('rowBarPadding', 1));
    const paddingBottom = context.option('rowBarBottomPadding', context.option('rowBarPadding', 1));
    const columnPadding = context.option('columnPadding', 5);
    return {
      template: `<div class='bar' style='top:${paddingTop}px; background-color: ${col.color}'>
          <span class='number ${this.renderValue ? '' : 'hoverOnly'}'></span>
        </div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        const total = col.getActualWidth();
        const width = col.getActualWidth() * col.getNumber(d.v, d.dataIndex);
        const w = isNaN(width) ? 0 : width;
        attr(n, {
          title: col.getLabel(d.v, d.dataIndex)
        }, {
          width: `${w}px`,
          height: `${context.rowHeight(i) - (paddingTop + paddingBottom)}px`,
          top: `${paddingTop}px`,
          'background-color': this.colorOf(d.v, i, col),
          'margin-right': `${total - w + columnPadding}px` //compensate to the full length using marg
        });
        n.querySelector('span').textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const paddingTop = context.option('rowBarTopPadding', context.option('rowBarPadding', 1));
    const paddingBottom = context.option('rowBarBottomPadding', context.option('rowBarPadding', 1));
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      ctx.fillStyle = this.colorOf(d.v, i, col);
      const width = col.getWidth() * col.getNumber(d.v, d.dataIndex);
      ctx.fillRect(0, paddingTop, isNaN(width) ? 0 : width, context.rowHeight(i) - (paddingTop + paddingBottom));
      if (this.renderValue || context.hovered(d.dataIndex) || context.selected(d.dataIndex)) {
        ctx.fillStyle = context.option('style.text', 'black');
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 1, 0, col.getWidth() - 1, context.textHints);
      }
    };
  }
}
