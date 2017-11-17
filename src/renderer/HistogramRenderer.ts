import ICellRendererFactory from './ICellRendererFactory';
import Column, {IStatistics} from '../model/Column';
import {INumberColumn, isNumberColumn} from '../model/INumberColumn';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import {IDOMCellRenderer, IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IGroup} from '../model/Group';
import {computeStats, getNumberOfBins} from '../provider/math';
import {forEachChild} from '../utils';
import {isNumbersColumn, default as NumbersColumn} from '../model/NumbersColumn';
import {isMissingValue} from '../model/missing';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {renderMissingCanvas, renderMissingDOM} from './missing';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class HistogramRenderer implements ICellRendererFactory {
  readonly title = 'Histogram';

  canRender(col: Column, isGroup: boolean) {
    return (isNumberColumn(col) && isGroup) || (isNumbersColumn(col) && !isGroup);
  }

  private static getHistDOMRenderer(totalNumberOfRows: number, col: INumberColumn & Column) {
    const guessedBins = getNumberOfBins(totalNumberOfRows);
    let bins = '';
    for (let i = 0; i < guessedBins; ++i) {
      bins += `<div style="height: 0" title="Bin ${i}: 0"></div>`;
    }

    const render = (n: HTMLElement, rows: IDataRow[], globalHist: IStatistics | null) => {
      const {bins, max, hist} = HistogramRenderer.createHist(globalHist, guessedBins, rows, col);
      //adapt the number of children
      if (n.children.length !== bins) {
        let bins = '';
        for (let i = 0; i < guessedBins; ++i) {
          bins += `<div style="height: 0" title="Bin ${i}: 0"></div>`;
        }
        n.innerHTML = bins;
      }
      forEachChild(n, (d: HTMLElement, i) => {
        const {x, dx, y} = hist[i];
        d.style.height = `${Math.round(y * 100 / max)}%`;
        d.title = `${NumbersColumn.DEFAULT_FORMATTER(x)} - ${NumbersColumn.DEFAULT_FORMATTER(x + dx)} (${y})`;
      });
    };
    return {template: `<div>${bins}</div>`, render};
  }

  createDOM(col: NumbersColumn, context: IDOMRenderContext): IDOMCellRenderer {
    const {template, render} = HistogramRenderer.getHistDOMRenderer(context.totalNumberOfRows, col);
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

  createGroupDOM(col: INumberColumn & Column, context: IDOMRenderContext): IDOMGroupRenderer {
    const {template, render} = HistogramRenderer.getHistDOMRenderer(context.totalNumberOfRows, col);
    return {
      template,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[], globalHist: IStatistics | null) => {
        render(n, rows, globalHist);
      }
    };
  }

  private static getHistCanvasRenderer(col: INumberColumn & Column, context: ICanvasRenderContext) {
    const guessedBins = getNumberOfBins(context.totalNumberOfRows);
    const padding = context.option('rowBarPadding', 1);

    return (ctx: CanvasRenderingContext2D, height: number, rows: IDataRow[], globalHist: IStatistics | null) => {
      const {max, bins, hist} = HistogramRenderer.createHist(globalHist, guessedBins, rows, col);
      const widthPerBin = context.colWidth(col) / bins;
      const total = height - padding;

      ctx.fillStyle = context.option('style.histogram', 'lightgray');
      hist.forEach(({y}, i) => {
        const height = (y / max) * total;
        ctx.fillRect(i * widthPerBin + padding, (total - height) + padding, widthPerBin - 2 * padding, height);
      });
    };
  }

  private static createHist(globalHist: IStatistics | null, guessedBins: number, rows: IDataRow[], col: INumberColumn & Column) {
    const bins = globalHist ? globalHist.hist.length : guessedBins;
    let stats: IStatistics;
    if (isNumbersColumn(col)) {
      //multiple values
      const values = (<number[]>[]).concat(...rows.map((r) => col.getNumbers(r.v, r.dataIndex)));
      stats = computeStats(values, [], (v: number) => v,  isMissingValue, [0, 1], bins);
    } else {
      stats = computeStats(rows, rows.map((r) => r.dataIndex), (r: IDataRow) => col.getNumber(r.v, r.dataIndex), (r: IDataRow) => col.isMissing(r.v, r.dataIndex), [0, 1], bins);
    }

    const max = Math.max(stats.maxBin, globalHist ? globalHist.maxBin : 0);
    return {bins, max, hist: stats.hist};
  }

  createCanvas(col: NumbersColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    const r = HistogramRenderer.getHistCanvasRenderer(col, context);
    return (ctx: CanvasRenderingContext2D, row: IDataRow, i: number, _dx: number, _dy: number, _group: IGroup, globalHist: IStatistics | null) => {
      if (renderMissingCanvas(ctx, col, row, context.rowHeight(i))) {
          return;
      }
      return r(ctx, context.rowHeight(i), [row], globalHist);
    };
  }


  createGroupCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const r = HistogramRenderer.getHistCanvasRenderer(col, context);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[], _dx: number, _dy: number, globalHist: IStatistics | null) => {
      return r(ctx, context.groupHeight(group), rows, globalHist);
    };
  }
}
