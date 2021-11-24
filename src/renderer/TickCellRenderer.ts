import { round } from '../internal';
import { Column, IDataRow, INumberColumn, isNumberColumn } from '../model';
import { CANVAS_HEIGHT, TICK } from '../styles';
import { colorOf } from './impose';
import {
  ERenderMode,
  ICellRenderer,
  ICellRendererFactory,
  IGroupCellRenderer,
  IImposer,
  IRenderContext,
  ISummaryRenderer,
} from './interfaces';
import { renderMissingCanvas, renderMissingDOM } from './missing';
import { noRenderer } from './utils';

export default class DotCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Tick';
  readonly groupTitle: string = 'Ticks';

  canRender(col: Column, mode: ERenderMode): boolean {
    return isNumberColumn(col) && mode === ERenderMode.CELL;
  }

  create(col: INumberColumn, context: IRenderContext, imposer?: IImposer): ICellRenderer {
    const width = col.getWidth();
    return {
      template: `<div><div></div></div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        const color = colorOf(col, d, imposer);
        const l = col.getLabel(d);
        const v = col.getNumber(d);
        n.title = l;
        const tick = n.firstElementChild as HTMLElement;
        tick.title = context.sanitize(l);
        tick.style.background = context.sanitize(color);
        tick.style.left = `${round(v * 100, 2)}%`;
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        const color = colorOf(col, d, imposer);
        const v = col.getNumber(d);

        ctx.save();
        ctx.globalAlpha = TICK.opacity;
        ctx.fillStyle = color || TICK.color;
        ctx.fillRect(Math.max(0, v * width - TICK.size / 2), 0, TICK.size, CANVAS_HEIGHT);
        ctx.restore();
      },
    };
  }

  createGroup(): IGroupCellRenderer {
    return noRenderer;
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
