import { DENSE_HISTOGRAM } from '../constants';
import { round } from '../internal';
import { Column, IDataRow, isCategoricalColumn, ICategoricalColumn } from '../model';
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

export default class CategoricalTickCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Tick';
  /**
   * flag to always render the value
   * @type {boolean}
   */
  constructor(private readonly renderValue: boolean = false) {}

  canRender(col: Column, mode: ERenderMode): boolean {
    return isCategoricalColumn(col) && mode === ERenderMode.CELL;
  }

  create(col: ICategoricalColumn, context: IRenderContext, imposer?: IImposer): ICellRenderer {
    const width = col.getWidth();
    return {
      template: `<div><div></div><span ${
        this.renderValue ? '' : `class="${cssClass('text-shadow')} ${cssClass('hover-only')}"`
      }></span></div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        const perElem = 100 / col.categories.length;
        let color = colorOf(col, d, imposer);
        if (col.categories.length > DENSE_HISTOGRAM) {
          color = adaptColor(color, SMALL_MARK_LIGHTNESS_FACTOR);
        }
        const l = context.sanitize(col.getLabel(d));
        const index = col.categories.indexOf(col.getCategory(d));
        n.title = l;
        const tick = n.firstElementChild as HTMLElement;
        tick.style.background = context.sanitize(color);
        tick.style.left = `${round(perElem * index, 2)}%`;
        tick.style.width = `${round(perElem, 2)}%`;
        const label = n.lastElementChild as HTMLElement;
        label.textContent = l;
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        let color = colorOf(col, d, imposer);
        if (col.categories.length > DENSE_HISTOGRAM) {
          color = adaptColor(color, SMALL_MARK_LIGHTNESS_FACTOR);
        }
        const perElem = width / col.categories.length;
        const index = col.categories.indexOf(col.getCategory(d));

        ctx.save();
        ctx.globalAlpha = TICK.opacity;
        ctx.fillStyle = color || TICK.color;
        ctx.fillRect(Math.max(0, index * perElem), 0, perElem, CANVAS_HEIGHT);
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
