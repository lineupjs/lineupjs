import {DENSE_HISTOGRAM} from '../config';
import {computeStats, getNumberOfBins, IStatistics} from '../internal/math';
import {IDataRow, IGroup, isMissingValue} from '../model';
import Column from '../model/Column';
import {
  DEFAULT_FORMATTER, INumberColumn, INumbersColumn, isNumberColumn,
  isNumbersColumn
} from '../model/INumberColumn';
import {colorOf} from './impose';
import {default as IRenderContext, ERenderMode, ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingDOM} from './missing';
import {forEachChild, noop, noRenderer} from './utils';

/**
 * a renderer rendering a bar for numerical columns
 */
export default class HistogramCellRenderer implements ICellRendererFactory {
  readonly title = 'Histogram';

  canRender(col: Column, mode: ERenderMode) {
    return (isNumberColumn(col) && mode !== ERenderMode.CELL) || (isNumbersColumn(col) && mode === ERenderMode.CELL);
  }

  private static getHistDOMRenderer(totalNumberOfRows: number, col: INumberColumn, globalHist: IStatistics | null, imposer?: IImposer) {
    const guessedBins = getNumberOfBins(totalNumberOfRows);
    let bins = '';
    for (let i = 0; i < guessedBins; ++i) {
      bins += `<div title="Bin ${i}: 0"><div style="height: 0" ></div></div>`;
    }

    const render = (n: HTMLElement, rows: IDataRow[]) => {
      const {bins, max, hist} = HistogramCellRenderer.createHist(globalHist, guessedBins, rows, col);
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
    return {template: `<div${guessedBins > DENSE_HISTOGRAM ? ' class="lu-dense' : ''}>${bins}</div>`, render};
  }

  create(col: INumbersColumn, context: IRenderContext, hist: IStatistics | null, imposer?: IImposer) {
    const {template, render} = HistogramCellRenderer.getHistDOMRenderer(context.totalNumberOfRows, col, hist, imposer);
    return {
      template,
      update: (n: HTMLElement, row: IDataRow) => {
        if (renderMissingDOM(n, col, row)) {
          return;
        }
        render(n, [row]);
      },
      render: noop
    };
  }

  createGroup(col: INumberColumn, context: IRenderContext, hist: IStatistics | null, imposer?: IImposer) {
    const {template, render} = HistogramCellRenderer.getHistDOMRenderer(context.totalNumberOfRows, col, hist, imposer);
    return {
      template,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        render(n, rows);
      }
    };
  }

  createSummary(_col: INumberColumn, _context: IRenderContext, _interactive: boolean, _imposer?: IImposer) {
    // TODO
    return noRenderer;
  }

  private static createHist(globalHist: IStatistics | null, guessedBins: number, rows: IDataRow[], col: INumberColumn) {
    const bins = globalHist ? globalHist.hist.length : guessedBins;
    let stats: IStatistics;
    if (isNumbersColumn(col)) {
      //multiple values
      const values = (<number[]>[]).concat(...rows.map((r) => col.getNumbers(r)));
      stats = computeStats(values, (v: number) => v, isMissingValue, [0, 1], bins);
    } else {
      stats = computeStats(rows, (r: IDataRow) => col.getNumber(r), (r: IDataRow) => col.isMissing(r), [0, 1], bins);
    }

    const max = Math.max(stats.maxBin, globalHist ? globalHist.maxBin : 0);
    return {bins, max, hist: stats.hist};
  }
}
