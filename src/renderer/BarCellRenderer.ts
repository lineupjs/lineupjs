import Column from '../model/Column';
import {INumberColumn, isNumberColumn, isNumbersColumn} from '../model/INumberColumn';
import {IDataRow} from '../provider/ADataProvider';
import {adaptDynamicColorToBgColor, setText, attr, clipText} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import ICellRendererFactory from './ICellRendererFactory';
import IDOMCellRenderer from './IDOMCellRenderers';
import {colorOf, IImposer} from './impose';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';


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

  canRender(col: Column, isGroup: boolean) {
    return isNumberColumn(col) && !isGroup && !isNumbersColumn(col);
  }

  createDOM(col: INumberColumn & Column, _context: IDOMRenderContext, imposer?: IImposer): IDOMCellRenderer {
    return {
      template: `<div title="">
          <div style='background-color: ${col.color}'>
            <span ${this.renderValue ? '' : 'class="lu-hover-only"'}></span>
          </div>
        </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        const value = col.getNumber(d.v, d.dataIndex);
        const missing = renderMissingDOM(n, col, d);
        const w = isNaN(value) ? 0 : Math.round(value * 100 * 100) / 100;
        const title = col.getLabel(d.v, d.dataIndex);
        n.title = title;

        const bar = n.firstElementChild!;
        const color = colorOf(col, d, imposer);
        attr(<HTMLElement>bar, {
          title
        }, {
          width: missing ? '100%' : `${w}%`,
          'background-color': missing ? null : color
        });
        const item = <HTMLElement>bar.firstElementChild!;
        setText(item, title);
        adaptDynamicColorToBgColor(item, color || Column.DEFAULT_COLOR, w / 100);
      }
    };
  }

  createCanvas(col: INumberColumn & Column, context: ICanvasRenderContext, imposer?: IImposer): ICanvasCellRenderer {
    const paddingTop = context.option('rowBarTopPadding', context.option('rowBarPadding', 1));
    const paddingBottom = context.option('rowBarBottomPadding', context.option('rowBarPadding', 1));
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }
      ctx.fillStyle = colorOf(col, d, imposer) || Column.DEFAULT_COLOR;
      const width = context.colWidth(col) * col.getNumber(d.v, d.dataIndex);
      ctx.fillRect(0, paddingTop, isNaN(width) ? 0 : width, context.rowHeight(i) - (paddingTop + paddingBottom));
      if (this.renderValue || context.hovered(d.dataIndex) || context.selected(d.dataIndex)) {
        ctx.fillStyle = context.option('style.text', 'black');
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 1, 0, context.colWidth(col) - 1, context.textHints);
      }
    };
  }
}
