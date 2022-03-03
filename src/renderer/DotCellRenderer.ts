import { GUESSES_GROUP_HEIGHT, GUESSED_ROW_HEIGHT } from '../constants';
import { concatSeq, ISequence, round } from '../internal';
import {
  Column,
  DEFAULT_COLOR,
  IDataRow,
  INumberColumn,
  IOrderedGroup,
  isNumberColumn,
  isNumbersColumn,
} from '../model';
import { CANVAS_HEIGHT, DOT, cssClass } from '../styles';
import { colorOf } from './impose';
import {
  ERenderMode,
  ICellRendererFactory,
  IImposer,
  IRenderContext,
  ICellRenderer,
  IGroupCellRenderer,
  ISummaryRenderer,
} from './interfaces';
import { renderMissingCanvas, renderMissingDOM } from './missing';
import { adaptColor, noRenderer, SMALL_MARK_LIGHTNESS_FACTOR } from './utils';

const PADDED_HEIGHT = 0.8;
const radius = DOT.size / 2;
const radiusPercentage = (100 * radius) / GUESSED_ROW_HEIGHT;
const availableHeight = 100 * PADDED_HEIGHT - radiusPercentage * 2;
const shift = 100 * ((1 - PADDED_HEIGHT) / 2) + radiusPercentage;

export default class DotCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Dot';
  readonly groupTitle: string = 'Dots';

  /**
   * flag to always render the value for single dots
   * @type {boolean}
   */
  constructor(private readonly renderValue: boolean = false) {}

  canRender(col: Column, mode: ERenderMode): boolean {
    return isNumberColumn(col) && mode !== ERenderMode.SUMMARY;
  }

  private static getCanvasRenderer(col: INumberColumn, context: IRenderContext) {
    const width = context.colWidth(col);
    const pi2 = Math.PI * 2;
    const radius = DOT.size / 2;
    const availableHeight = GUESSES_GROUP_HEIGHT * PADDED_HEIGHT - radius * 2;
    const shift = GUESSES_GROUP_HEIGHT * ((1 - PADDED_HEIGHT) / 2) + radius;

    const render = (ctx: CanvasRenderingContext2D, vs: { value: number; color: string | null }[], width: number) => {
      ctx.save();
      ctx.globalAlpha = DOT.opacity;
      for (const v of vs) {
        ctx.fillStyle = v.color || DOT.color;
        const x = Math.min(width - radius, Math.max(radius, v.value * width));
        const y = round(Math.random() * availableHeight + shift, 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arc(x, y, radius, 0, pi2, true);
        ctx.fill();
      }
      ctx.restore();
    };
    return {
      template: `<canvas height="${GUESSES_GROUP_HEIGHT}"></canvas>`,
      render,
      width,
    };
  }

  private static getDOMRenderer(col: INumberColumn, sanitize: (v: string) => string) {
    const dots = !isNumbersColumn(col) ? 1 : col.dataLength!;
    let tmp = '';
    for (let i = 0; i < dots; ++i) {
      tmp += `<div style='background-color: ${DEFAULT_COLOR}' title=''></div>`;
    }

    const update = (n: HTMLElement, data: ISequence<{ value: number; label: string; color: string | null }>) => {
      //adapt the number of children
      const l = data.length;
      if (n.children.length !== l) {
        n.innerHTML = data.reduce((tmp, r) => {
          return `${tmp}<div style='background-color: ${sanitize(r.color)}' title='${sanitize(r.label)}'></div>`;
        }, '');
      }
      const children = n.children;

      data.forEach((v, i) => {
        const d = children[i] as HTMLElement;
        d.title = v.label;
        d.style.display = Number.isNaN(v.value) ? 'none' : null;
        d.style.left = `${round(v.value * 100, 2)}%`;
        // jitter
        d.style.top = l > 1 ? `${round(Math.random() * availableHeight + shift, 2)}%` : null;
        d.style.backgroundColor = v.color;
      });
    };

    const render = (ctx: CanvasRenderingContext2D, vs: number[], colors: (string | null)[], width: number) => {
      ctx.save();
      ctx.globalAlpha = DOT.opacity;
      vs.forEach((v, i) => {
        ctx.fillStyle = colors[i] || DOT.color;
        ctx.fillRect(Math.max(0, v * width - DOT.size / 2), 0, DOT.size, CANVAS_HEIGHT);
      });
      ctx.restore();
    };
    return { template: `<div>${tmp}</div>`, update, render };
  }

  private static getSingleDOMRenderer(sanitize: (v: string) => string, renderValue: boolean) {
    const update = (n: HTMLElement, value: number, label: string, color: string) => {
      const sanitizedLabel = sanitize(label);
      n.title = sanitizedLabel;
      const dot = n.firstElementChild as HTMLElement;
      dot.style.display = Number.isNaN(value) ? 'none' : null;
      dot.style.left = `${round(value * 100, 2)}%`;
      dot.style.backgroundColor = sanitize(color);
      const labelNode = n.lastElementChild as HTMLElement;
      labelNode.textContent = sanitizedLabel;
    };

    const render = (ctx: CanvasRenderingContext2D, value: number, color: string, width: number) => {
      ctx.save();
      ctx.globalAlpha = DOT.opacitySingle;
      ctx.fillStyle = color || DOT.color;
      ctx.fillRect(Math.max(0, value * width - DOT.size / 2), 0, DOT.size, CANVAS_HEIGHT);
      ctx.restore();
    };

    return {
      template: `<div class="${cssClass(
        'dot-single'
      )}"><div style='background-color: ${DEFAULT_COLOR}' title=''></div><span ${
        renderValue ? '' : `class="${cssClass('hover-only')}"`
      }></span></div>`,
      update,
      render,
    };
  }

  create(col: INumberColumn, context: IRenderContext, imposer?: IImposer): ICellRenderer {
    const width = context.colWidth(col);
    const formatter = col.getNumberFormat();

    if (!isNumbersColumn(col)) {
      // single
      const { template, render, update } = DotCellRenderer.getSingleDOMRenderer(context.sanitize, this.renderValue);
      return {
        template,
        update: (n, d) => {
          if (renderMissingDOM(n, col, d)) {
            return;
          }
          const color = adaptColor(colorOf(col, d, imposer), SMALL_MARK_LIGHTNESS_FACTOR);
          return update(n, col.getNumber(d), col.getLabel(d), color);
        },
        render: (ctx, d) => {
          const color = adaptColor(colorOf(col, d, imposer), SMALL_MARK_LIGHTNESS_FACTOR);
          return render(ctx, col.getNumber(d), color, width);
        },
      };
    }

    const { template, render, update } = DotCellRenderer.getDOMRenderer(col, context.sanitize);
    return {
      template,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        const color = adaptColor(colorOf(col, d, imposer), SMALL_MARK_LIGHTNESS_FACTOR);
        const data = col
          .getNumbers(d)
          .filter((vi: number) => !Number.isNaN(vi))
          .map((value) => ({ value, label: formatter(value), color }));
        return update(n, data);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        const color = adaptColor(colorOf(col, d, imposer), SMALL_MARK_LIGHTNESS_FACTOR);
        const vs: number[] = col.getNumbers(d).filter((vi: number) => !Number.isNaN(vi));
        return render(
          ctx,
          vs,
          vs.map((_: any) => color),
          width
        );
      },
    };
  }

  createGroup(col: INumberColumn, context: IRenderContext, imposer?: IImposer): IGroupCellRenderer {
    const { template, render, width } = DotCellRenderer.getCanvasRenderer(col, context);

    return {
      template,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks
          .groupRows(col, group, 'dot', (rows) => {
            //value, color, label,

            if (!isNumbersColumn(col)) {
              return Array.from(rows.map((r) => ({ value: col.getNumber(r), color: colorOf(col, r, imposer) })));
            }
            // concatenate all columns
            const vs = rows.map((r) => {
              const color = adaptColor(colorOf(col, r, imposer), SMALL_MARK_LIGHTNESS_FACTOR);
              return col
                .getNumbers(r)
                .filter((vi: number) => !Number.isNaN(vi))
                .map((value) => ({ value, color }));
            });
            return Array.from(concatSeq(vs));
          })
          .then((data) => {
            if (typeof data === 'symbol') {
              return;
            }
            const isMissing = !data || data.length === 0 || data.every((v) => Number.isNaN(v.value));
            n.classList.toggle(cssClass('missing'), isMissing);
            if (isMissing) {
              return;
            }
            const ctx = (n as HTMLCanvasElement).getContext('2d')!;
            ctx.canvas.width = width;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            render(ctx, data, width);
          });
      },
    };
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
