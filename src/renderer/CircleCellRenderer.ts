import ICellRendererFactory from './ICellRendererFactory';
import Column from '../model/Column';
import {INumberColumn, isNumberColumn, isNumbersColumn} from '../model/INumberColumn';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import {IDataRow} from '../provider/ADataProvider';
import {attr, clipText, setText} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {colorOf, IImposer} from './impose';

export default class CircleCellRenderer implements ICellRendererFactory {
  readonly title = 'Proportional Symbol';

  canRender(col: Column, isGroup: boolean) {
    return isNumberColumn(col) && !isGroup && !isNumbersColumn(col);
  }

  createDOM(col: INumberColumn & Column, _context: IDOMRenderContext, imposer?: IImposer) {
    return {
      template: `<div style="background: radial-gradient(circle closest-side, red 100%, transparent 100%)" title="">
              <div class="lu-hover-only"></div>
          </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const v = col.getNumber(d.v, d.dataIndex);
        const p = Math.round(v * 100);
        const missing = renderMissingDOM(n, col, d);
        attr(<HTMLElement>n, {}, {
          background: missing ? null : `radial-gradient(circle closest-side, ${colorOf(col, d, imposer)} ${p}%, transparent ${p}%)`
        },);
        setText(n.firstElementChild!, col.getLabel(d.v, d.dataIndex));
      }
    };
  }


  createCanvas(col: INumberColumn & Column, context: ICanvasRenderContext, imposer?: IImposer): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }

      const value = col.getNumber(d.v, d.dataIndex);
      const posy = (context.rowHeight(i) / 2);
      const posx = (context.colWidth(col) / 2);
      ctx.strokeStyle = ctx.fillStyle = colorOf(col, d, imposer) || Column.DEFAULT_COLOR;
      ctx.beginPath();
      ctx.arc(posx, posy, (context.rowHeight(i) / 2) * value, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      if (context.hovered(d.dataIndex) || context.selected(d.dataIndex)) {
        ctx.fillStyle = context.option('style.text', 'black');
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 1, 0, context.colWidth(col) - 1, context.textHints);
      }
    };
  }
}
