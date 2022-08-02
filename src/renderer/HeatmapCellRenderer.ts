import { Column, INumbersColumn, isNumbersColumn, IDataRow, IOrderedGroup } from '../model';
import { CANVAS_HEIGHT, cssClass } from '../styles';
import { ANumbersCellRenderer } from './ANumbersCellRenderer';
import { toHeatMapColor } from './BrightnessCellRenderer';
import type {
  IRenderContext,
  ICellRendererFactory,
  IImposer,
  ICellRenderer,
  IGroupCellRenderer,
  ISummaryRenderer,
} from './interfaces';
import { renderMissingValue, renderMissingDOM } from './missing';
import { noop, wideEnough } from './utils';
import { GUESSED_ROW_HEIGHT } from '../constants';
import { getSortLabel } from '../internal';

export default class HeatmapCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Heatmap';

  canRender(col: Column): boolean {
    return isNumbersColumn(col) && Boolean(col.dataLength);
  }

  private createContext(col: INumbersColumn, context: IRenderContext, imposer?: IImposer) {
    const width = context.colWidth(col);
    const cellDimension = width / col.dataLength!;
    const labels = col.labels;
    const render = (ctx: CanvasRenderingContext2D, data: number[], item: IDataRow, height: number) => {
      data.forEach((d: number, j: number) => {
        const x = j * cellDimension;
        if (Number.isNaN(d)) {
          renderMissingValue(ctx, cellDimension, height, x, 0);
          return;
        }
        ctx.fillStyle = toHeatMapColor(d, item, col, imposer);
        ctx.fillRect(x, 0, cellDimension, height);
      });
    };
    return {
      template: `<canvas height="${GUESSED_ROW_HEIGHT}" title=""></canvas>`,
      render,
      width,
      mover: (n: HTMLElement, values: string[], prefix?: string) => (evt: MouseEvent) => {
        const percent = evt.offsetX / width;
        const index = Math.max(0, Math.min(col.dataLength! - 1, Math.floor(percent * (col.dataLength! - 1) + 0.5)));
        n.title = `${prefix || ''}${labels[index]}: ${values[index]}`;
      },
    };
  }

  create(col: INumbersColumn, context: IRenderContext, _hist: any, imposer?: IImposer): ICellRenderer {
    const { template, render, mover, width } = this.createContext(col, context, imposer);

    return {
      template,
      update: (n: HTMLElement, d: IDataRow) => {
        const ctx = (n as HTMLCanvasElement).getContext('2d')!;
        ctx.canvas.width = width;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (renderMissingDOM(n, col, d)) {
          return;
        }
        n.onmousemove = mover(n, col.getLabels(d));
        n.onmouseleave = () => (n.title = '');
        render(ctx, col.getNumbers(d), d, GUESSED_ROW_HEIGHT);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        render(ctx, col.getNumbers(d), d, CANVAS_HEIGHT);
      },
    };
  }

  createGroup(col: INumbersColumn, context: IRenderContext, imposer?: IImposer): IGroupCellRenderer {
    const { template, render, mover, width } = this.createContext(col, context, imposer);
    const formatter = col.getNumberFormat();

    return {
      template,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        const data = context.tasks.groupRows(col, group, this.title, (rows) => ANumbersCellRenderer.choose(col, rows));
        const ctx = (n as HTMLCanvasElement).getContext('2d')!;
        ctx.canvas.width = width;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        const isMissing = !data || data.normalized.length === 0 || data.normalized.every((v) => Number.isNaN(v));
        n.classList.toggle(cssClass('missing'), isMissing);
        if (isMissing) {
          return;
        }

        n.onmousemove = mover(n, data.raw.map(formatter), `${getSortLabel(col.getSortMethod())} `);
        n.onmouseleave = () => (n.title = '');
        render(ctx, data.normalized, data.row!, GUESSED_ROW_HEIGHT);
      },
    };
  }

  createSummary(col: INumbersColumn, context: IRenderContext): ISummaryRenderer {
    let labels = col.labels.slice();
    while (labels.length > 0 && !wideEnough(col, labels.length)) {
      labels = labels.filter((_, i) => i % 2 === 0); // even
    }
    let templateRows = `<div class="${cssClass('heatmap')}">`;
    for (const label of labels) {
      templateRows += `<div class="${cssClass('heatmap-cell')}"  title="${context.sanitize(
        label
      )}" data-title="${context.sanitize(label)}"></div>`;
    }
    templateRows += '</div>';
    return {
      template: templateRows,
      update: noop,
    };
  }
}
