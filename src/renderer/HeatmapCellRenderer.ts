import {IDataRow, isMissingValue} from '../model';
import Column from '../model/Column';
import {DEFAULT_FORMATTER, INumbersColumn, isNumbersColumn} from '../model/INumberColumn';
import {CANVAS_HEIGHT, cssClass} from '../styles';
import {ANumbersCellRenderer} from './ANumbersCellRenderer';
import {toHeatMapColor} from './BrightnessCellRenderer';
import IRenderContext, {ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingValue, renderMissingDOM} from './missing';
import {noop, wideEnough} from './utils';
import {IGroup} from '../model/interfaces';

const GUESSED_HEIGHT = 20;

/** @internal */
export default class HeatmapCellRenderer implements ICellRendererFactory {
  readonly title = 'Heatmap';

  canRender(col: Column) {
    return isNumbersColumn(col) && Boolean(col.dataLength);
  }

  private createContext(col: INumbersColumn, context: IRenderContext, _hist: any, imposer?: IImposer) {
    const width = context.colWidth(col);
    const cellDimension = width / col.dataLength!;
    const labels = col.labels;
    const render = (ctx: CanvasRenderingContext2D, data: number[], item: IDataRow, height: number) => {
      data.forEach((d: number, j: number) => {
        const x = j * cellDimension;
        if (isMissingValue(d)) {
          renderMissingValue(ctx, cellDimension, height, x, 0);
          return;
        }
        ctx.fillStyle = toHeatMapColor(d, item, col, imposer);
        ctx.fillRect(x, 0, cellDimension, height);
      });
    };
    return {
      template: `<canvas height="${GUESSED_HEIGHT}" title=""></canvas>`,
      render,
      width,
      mover: (n: HTMLElement, values: string[]) => (evt: MouseEvent) => {
        const percent = evt.offsetX / width;
        const index = Math.max(0, Math.min(col.dataLength! - 1, Math.floor(percent * (col.dataLength! - 1) + 0.5)));
        n.title = `${labels[index]}: ${values[index]}`;
      }
    };
  }

  create(col: INumbersColumn, context: IRenderContext, _hist: any, imposer?: IImposer) {
    const {template, render, mover, width} = this.createContext(col, context, _hist, imposer);
    return {
      template,
      update: (n: HTMLElement, d: IDataRow) => {
        const ctx = (<HTMLCanvasElement>n).getContext('2d')!;
        ctx.canvas.width = width;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (renderMissingDOM(n, col, d)) {
          return;
        }
        n.onmousemove = mover(n, col.getRawNumbers(d).map(DEFAULT_FORMATTER));
        n.onmouseleave = () => n.title = '';
        render(ctx, col.getNumbers(d), d, GUESSED_HEIGHT);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        render(ctx, col.getNumbers(d), d, CANVAS_HEIGHT);
      }
    };
  }

  createGroup(col: INumbersColumn, context: IRenderContext, _hist: any, imposer?: IImposer) {
    const {template, render, mover, width} = this.createContext(col, context, _hist, imposer);
    return {
      template,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        // render a heatmap
        const {normalized, raw} = ANumbersCellRenderer.choose(col, rows);
        const ctx = (<HTMLCanvasElement>n).getContext('2d')!;
        ctx.canvas.width = width;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        n.onmousemove = mover(n, raw.map(DEFAULT_FORMATTER));
        n.onmouseleave = () => n.title = '';
        render(ctx, normalized, rows[0], GUESSED_HEIGHT);
      }
    };
  }

  createSummary(col: INumbersColumn) {
    let labels = col.labels.slice();
    while (labels.length > 0 && !wideEnough(col, labels.length)) {
      labels = labels.filter((_, i) => i % 2 === 0); // even
    }
    let templateRows = `<div class="${cssClass('heatmap')}">`;
    for (const label of labels) {
      templateRows += `<div title="${label}" data-title="${label}"></div>`;
    }
    templateRows += '</div>';
    return {
      template: templateRows,
      update: noop
    };
  }
}
