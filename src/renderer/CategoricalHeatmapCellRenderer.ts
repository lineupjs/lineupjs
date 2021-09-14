import { Column, ICategoricalsColumn, ICategory, IDataRow, IOrderedGroup, isCategoricalsColumn } from '../model';
import { toMostFrequentCategoricals } from '../model/internalCategorical';
import { CANVAS_HEIGHT, cssClass } from '../styles';
import type {
  ICellRendererFactory,
  IRenderContext,
  ICellRenderer,
  IGroupCellRenderer,
  ISummaryRenderer,
} from './interfaces';
import { renderMissingDOM, renderMissingValue } from './missing';
import { noop, wideEnough } from './utils';
import { GUESSED_ROW_HEIGHT } from '../constants';

export default class CategoricalHeatmapCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Heatmap';

  canRender(col: Column): boolean {
    return isCategoricalsColumn(col) && Boolean(col.dataLength);
  }

  private createContext(col: ICategoricalsColumn, context: IRenderContext) {
    const width = context.colWidth(col);
    const cellDimension = width / col.dataLength!;
    const labels = col.labels;
    const render = (ctx: CanvasRenderingContext2D, data: (ICategory | null)[], height: number) => {
      data.forEach((d: ICategory | null, j: number) => {
        const x = j * cellDimension;
        if (d == null) {
          renderMissingValue(ctx, cellDimension, height, x, 0);
          return;
        }
        ctx.fillStyle = d.color;
        ctx.fillRect(x, 0, cellDimension, height);
      });
    };
    return {
      template: `<canvas height="${GUESSED_ROW_HEIGHT}" title=""></canvas>`,
      render,
      width,
      mover: (n: HTMLElement, values: string[]) => (evt: MouseEvent) => {
        const percent = evt.offsetX / width;
        const index = Math.max(0, Math.min(col.dataLength! - 1, Math.floor(percent * (col.dataLength! - 1) + 0.5)));
        n.title = `${labels[index]}: ${values[index]}`;
      },
    };
  }

  create(col: ICategoricalsColumn, context: IRenderContext): ICellRenderer {
    const { template, render, mover, width } = this.createContext(col, context);

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
        render(ctx, col.getCategories(d), GUESSED_ROW_HEIGHT);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        render(ctx, col.getCategories(d), CANVAS_HEIGHT);
      },
    };
  }

  createGroup(col: ICategoricalsColumn, context: IRenderContext): IGroupCellRenderer {
    const { template, render, mover, width } = this.createContext(col, context);

    return {
      template,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks
          .groupRows(col, group, this.title, (rows) => toMostFrequentCategoricals(rows, col))
          .then((data) => {
            if (typeof data === 'symbol') {
              return;
            }
            const ctx = (n as HTMLCanvasElement).getContext('2d')!;
            ctx.canvas.width = width;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            const isMissing = !data || data.length === 0 || data.every((d) => d == null);
            n.classList.toggle(cssClass('missing'), isMissing);
            if (isMissing) {
              return;
            }
            n.onmousemove = mover(
              n,
              data.map((d) => (d ? d.label : 'missing'))
            );
            n.onmouseleave = () => (n.title = '');
            render(ctx, data, GUESSED_ROW_HEIGHT);
          });
      },
    };
  }

  createSummary(col: ICategoricalsColumn, context: IRenderContext): ISummaryRenderer {
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
