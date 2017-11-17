import {INumberColumn, isNumberColumn, isNumbersColumn} from '../model/INumberColumn';
import Column from '../model/Column';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {clipText, setText} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {hsl} from 'd3';
import ICellRendererFactory from './ICellRendererFactory';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {colorOf, IImposer} from './impose';

export function toHeatMapColor(row: IDataRow, col: INumberColumn & Column, imposer?: IImposer) {
  let v = col.getNumber(row.v, row.dataIndex);
  if (isNaN(v)) {
    v = 1; // max = brightest
  }
  //hsl space encoding, encode in lightness
  const color = hsl(colorOf(col, row, imposer) || Column.DEFAULT_COLOR);
  color.l = 1 - v; // largest value = darkest color
  return color.toString();
}

export default class HeatmapCellRenderer implements ICellRendererFactory {
  readonly title = 'Brightness';

  canRender(col: Column, isGroup: boolean) {
    return isNumberColumn(col) && !isGroup && !isNumbersColumn(col);
  }

  createDOM(col: INumberColumn & Column, _context: IDOMRenderContext, imposer?: IImposer): IDOMCellRenderer {
    return {
      template: `<div title="">
        <div style="background-color: ${col.color}"></div><div> </div>
      </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        n.title = col.getLabel(d.v, d.dataIndex);
        (<HTMLDivElement>n.firstElementChild!).style.backgroundColor = missing ? null : toHeatMapColor(d, col, imposer);
        setText(<HTMLSpanElement>n.lastElementChild!, n.title);
      }
    };
  }

  createCanvas(col: INumberColumn & Column, context: ICanvasRenderContext, imposer?: IImposer): ICanvasCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }
      ctx.fillStyle = toHeatMapColor(d, col, imposer);
      const cell = Math.min(context.colWidth(col) * 0.3, Math.max(context.rowHeight(i) - padding * 2, 0));
      ctx.fillRect(0, 0, cell, cell);
      ctx.fillStyle = context.option('style.text', 'black');
      clipText(ctx, col.getLabel(d.v, d.dataIndex), cell + 2, 0, context.colWidth(col) - cell - 2, context.textHints);
    };
  }
}
