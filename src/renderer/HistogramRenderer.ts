import Column from '../model/Column';
import {DEFAULT_FORMATTER, INumberColumn, isNumberColumn, isNumbersColumn} from '../model/INumberColumn';
import {IDataRow, IGroup, isMissingValue} from '../model';
import {computeStats, getNumberOfBins, IStatistics} from '../internal/math';
import {forEachChild} from './utils';
import NumbersColumn from '../model/NumbersColumn';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {colorOf} from './impose';
import {DENSE_HISTOGRAM} from '../config';
import {ICellRendererFactory, IImposer, default as IRenderContext} from './interfaces';

/**
 * a renderer rendering a bar for numerical columns
 */
export default class HistogramRenderer implements ICellRendererFactory {
  readonly title = 'Histogram';

  canRender(col: Column, isGroup: boolean) {
    return (isNumberColumn(col) && isGroup) || (isNumbersColumn(col) && !isGroup);
  }

  private static getHistDOMRenderer(totalNumberOfRows: number, col: INumberColumn & Column, imposer?: IImposer) {
    const guessedBins = getNumberOfBins(totalNumberOfRows);
    let bins = '';
    for (let i = 0; i < guessedBins; ++i) {
      bins += `<div title="Bin ${i}: 0"><div style="height: 0" ></div></div>`;
    }

    const render = (n: HTMLElement, rows: IDataRow[], globalHist: IStatistics | null) => {
      const {bins, max, hist} = HistogramRenderer.createHist(globalHist, guessedBins, rows, col);
      //adapt the number of children
      if (n.children.length !== bins) {
        let tmp = '';
        for (let i = 0; i < bins; ++i) {
          tmp += `<div title="Bin ${i}: 0">><div style="height: 0" ></div></div>`;
        }
        n.innerHTML = tmp;
      }
      n.classList.toggle('lu-dense', bins > DENSE_HISTOGRAM);
      forEachChild(n, (d: HTMLElement, i) => {
        const {x0, x1, length} = hist[i];
        const inner = <HTMLElement>d.firstElementChild!;
        d.title = `${DEFAULT_FORMATTER(x0)} - ${DEFAULT_FORMATTER(x1)} (${length})`;
        inner.style.height = `${Math.round(length * 100 / max)}%`;
        inner.style.backgroundColor = colorOf(col, null, imposer);
      });
    };
    return {template: `<div${guessedBins > DENSE_HISTOGRAM ? ' class="lu-dense': ''}>${bins}</div>`, render};
  }

  create(col: NumbersColumn, context: IRenderContext, imposer?: IImposer) {
    const {template, render} = HistogramRenderer.getHistDOMRenderer(context.totalNumberOfRows, col, imposer);
    return {
      template,
      update: (n: HTMLElement, row: IDataRow, _i: number, _group: IGroup, globalHist: IStatistics | null) => {
        if (renderMissingDOM(n, col, row)) {
          return;
        }
        render(n, [row], globalHist);
      }
    };
  }

  createGroupDOM(col: INumberColumn & Column, context: IDOMRenderContext, imposer?: IImposer): IDOMGroupRenderer {
    const {template, render} = HistogramRenderer.getHistDOMRenderer(context.totalNumberOfRows, col, imposer);
    return {
      template,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[], globalHist: IStatistics | null) => {
        render(n, rows, globalHist);
      }
    };
  }

  private static getHistCanvasRenderer(col: INumberColumn & Column, context: ICanvasRenderContext, imposer?: IImposer) {
    const guessedBins = getNumberOfBins(context.totalNumberOfRows);
    const padding = guessedBins > DENSE_HISTOGRAM ? 0 : context.option('rowBarPadding', 1);

    return (ctx: CanvasRenderingContext2D, height: number, rows: IDataRow[], globalHist: IStatistics | null) => {
      const {max, bins, hist} = HistogramRenderer.createHist(globalHist, guessedBins, rows, col);
      const widthPerBin = context.colWidth(col) / bins;
      const total = height - padding;

      ctx.fillStyle = colorOf(col, null, imposer) || context.option('style.histogram', 'lightgray');
      hist.forEach(({length}, i) => {
        const height = (length / max) * total;
        ctx.fillRect(i * widthPerBin + padding, (total - height) + padding, widthPerBin - 2 * padding, height);
      });
    };
  }

  private static createHist(globalHist: IStatistics | null, guessedBins: number, rows: IDataRow[], col: INumberColumn & Column) {
    const bins = globalHist ? globalHist.hist.length : guessedBins;
    let stats: IStatistics;
    if (isNumbersColumn(col)) {
      //multiple values
      const values = (<number[]>[]).concat(...rows.map((r) => col.getNumbers(r)));
      stats = computeStats(values, (v: number) => v,  isMissingValue, [0, 1], bins);
    } else {
      stats = computeStats(rows, (r: IDataRow) => col.getNumber(r), (r: IDataRow) => col.isMissing(r), [0, 1], bins);
    }

    const max = Math.max(stats.maxBin, globalHist ? globalHist.maxBin : 0);
    return {bins, max, hist: stats.hist};
  }

  createCanvas(col: NumbersColumn, context: ICanvasRenderContext, imposer?: IImposer): ICanvasCellRenderer {
    const r = HistogramRenderer.getHistCanvasRenderer(col, context, imposer);
    return (ctx: CanvasRenderingContext2D, row: IDataRow, i: number, _dx: number, _dy: number, _group: IGroup, globalHist: IStatistics | null) => {
      if (renderMissingCanvas(ctx, col, row, context.rowHeight(i))) {
          return;
      }
      return r(ctx, context.rowHeight(i), [row], globalHist);
    };
  }


  createGroupCanvas(col: INumberColumn & Column, context: ICanvasRenderContext, imposer?: IImposer): ICanvasGroupRenderer {
    const r = HistogramRenderer.getHistCanvasRenderer(col, context, imposer);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[], _dx: number, _dy: number, globalHist: IStatistics | null) => {
      return r(ctx, context.groupHeight(group), rows, globalHist);
    };
  }
}
