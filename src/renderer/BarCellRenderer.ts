import ICellRendererFactory from './ICellRendererFactory';
import Column from '../model/Column';
import {INumberColumn, isNumberColumn} from '../model/INumberColumn';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr, clipText, setText} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import CompositeNumberColumn from '../model/CompositeNumberColumn';
import CategoricalNumberColumn from '../model/CategoricalNumberColumn';
import {isNumbersColumn} from '../model/NumbersColumn';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class BarCellRenderer implements ICellRendererFactory {
  readonly title = 'Bar';

  /**
   * flag to always render the value
   * @type {boolean}
   */

  constructor(private readonly renderValue: boolean = false) {
  }

  private colorOf(d: any, i: number, col: Column) {
    if (col instanceof CompositeNumberColumn || col instanceof CategoricalNumberColumn) {
      return col.getColor(d, i);
    }
    return col.color;
  }

  canRender(col: Column, isGroup: boolean) {
    return isNumberColumn(col) && !isGroup && !isNumbersColumn(col);
  }

  createDOM(col: INumberColumn & Column): IDOMCellRenderer {
    return {
      template: `<div title="">
          <div style='background-color: ${col.color}'>
            <span ${this.renderValue ? '' : 'class="lu-hover-only"'}></span>
          </div>
        </div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        const value = col.getNumber(d.v, d.dataIndex);
        const missing = renderMissingDOM(n, col, d);
        const w = isNaN(value) ? 0 : Math.round(value * 100 * 100) / 100;
        const title = col.getLabel(d.v, d.dataIndex);
        n.title = title;

        const bar = n.firstElementChild!;
        attr(<HTMLElement>bar, {
          title
        }, {
          width: missing ? '100%' : `${w}%`,
          'background-color': missing ? null : this.colorOf(d.v, i, col)
        });
        setText(bar.firstElementChild!, title);
      }
    };
  }

  createCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const paddingTop = context.option('rowBarTopPadding', context.option('rowBarPadding', 1));
    const paddingBottom = context.option('rowBarBottomPadding', context.option('rowBarPadding', 1));
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }
      ctx.fillStyle = this.colorOf(d.v, i, col) || '';
      const width = context.colWidth(col) * col.getNumber(d.v, d.dataIndex);
      ctx.fillRect(0, paddingTop, isNaN(width) ? 0 : width, context.rowHeight(i) - (paddingTop + paddingBottom));
      if (this.renderValue || context.hovered(d.dataIndex) || context.selected(d.dataIndex)) {
        ctx.fillStyle = context.option('style.text', 'black');
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 1, 0, context.colWidth(col) - 1, context.textHints);
      }
    };
  }
}
