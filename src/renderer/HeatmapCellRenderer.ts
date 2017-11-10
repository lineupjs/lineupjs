import {INumberColumn, isNumberColumn} from '../model/INumberColumn';
import Column from '../model/Column';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {clipText, setText} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {hsl} from 'd3';
import ICellRendererFactory from './ICellRendererFactory';
import {renderMissingCanvas, renderMissingDOM} from './missing';

export function toHeatMapColor(d: any, index: number, col: INumberColumn & Column) {
  let v = col.getNumber(d, index);
  if (isNaN(v)) {
    v = 0;
  }
  //hsl space encoding, encode in lightness
  const color = hsl(col.color || Column.DEFAULT_COLOR);
  color.l = v;
  return color.toString();
}

export default class HeatmapCellRenderer implements ICellRendererFactory {
  readonly title: 'Brightness';

  canRender(col: Column, isGroup: boolean) {
    return isNumberColumn(col) && !isGroup;
  }

  createDOM(col: INumberColumn & Column): IDOMCellRenderer {
    return {
      template: `<div title="">
        <div style="background-color: ${col.color}"></div><div> </div>
      </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        n.title = col.getLabel(d.v, d.dataIndex);
        (<HTMLDivElement>n.firstElementChild!).style.backgroundColor = missing ? null : toHeatMapColor(d.v, d.dataIndex, col);
        setText(<HTMLSpanElement>n.lastElementChild!, n.title);
      }
    };
  }

  createCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }
      ctx.fillStyle = toHeatMapColor(d.v, d.dataIndex, col);
      const cell = Math.min(context.colWidth(col) * 0.3, Math.max(context.rowHeight(i) - padding * 2, 0));
      ctx.fillRect(0, 0, cell, cell);
      ctx.fillStyle = context.option('style.text', 'black');
      clipText(ctx, col.getLabel(d.v, d.dataIndex), cell + 2, 0, context.colWidth(col) - cell - 2, context.textHints);
    };
  }
}
