import { round } from '../internal';
import { Column, IDataRow, INumberColumn, isNumberColumn } from '../model';
import { CANVAS_HEIGHT, cssClass, TICK } from '../styles';
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
import { adaptColor, noRenderer, SMALL_MARK_LIGHTNESS_FACTOR } from './utils';

export default class TickCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Tick';
  readonly groupTitle: string = 'Ticks';
  /**
   * flag to always render the value
   * @type {boolean}
   */

  constructor(private readonly renderValue: boolean = false) {}

  canRender(col: Column, mode: ERenderMode): boolean {
    return isNumberColumn(col) && mode === ERenderMode.CELL;
  }

  create(col: INumberColumn, context: IRenderContext, imposer?: IImposer): ICellRenderer {
    const width = col.getWidth();
    return {
      template: `<div><div></div><span ${
        this.renderValue ? '' : `class="${cssClass('text-shadow')} ${cssClass('hover-only')}"`
      }></span></div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        const color = adaptColor(colorOf(col, d, imposer), SMALL_MARK_LIGHTNESS_FACTOR);
        const l = context.sanitize(col.getLabel(d));
        const v = col.getNumber(d);
        n.title = l;
        const tick = n.firstElementChild as HTMLElement;
        tick.style.background = context.sanitize(color);
        tick.style.left = `${round(v * 100, 2)}%`;
        const label = n.lastElementChild as HTMLElement;
        label.textContent = l;
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        const color = adaptColor(colorOf(col, d, imposer), SMALL_MARK_LIGHTNESS_FACTOR);
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
