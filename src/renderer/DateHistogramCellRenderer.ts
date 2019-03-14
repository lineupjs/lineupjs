import {dateStatsBuilder, getNumberOfBins, IDateStatistics} from '../internal';
import {Column, IDataRow, IDateColumn, IDatesColumn, IOrderedGroup, isDateColumn, isDatesColumn} from '../model';
import {cssClass} from '../styles';
import {ERenderMode, ICellRendererFactory, IRenderContext} from './interfaces';
import {renderMissingDOM} from './missing';
import {colorOf} from './utils';
import {histogramRender, histogramTemplate} from './histogram';

/** @internal */
export default class DateHistogramCellRenderer implements ICellRendererFactory {
  readonly title = 'Histogram';

  canRender(col: Column, mode: ERenderMode) {
    return (isDateColumn(col) && mode !== ERenderMode.CELL) || (isDatesColumn(col) && mode === ERenderMode.CELL);
  }

  create(col: IDatesColumn, _context: IRenderContext) {
    const {template, render} = getHistDOMRenderer(col);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, row: IDataRow) => {
        if (renderMissingDOM(n, col, row)) {
          return;
        }
        const b = dateStatsBuilder();
        for (const n of col.getDates(row)) {
          b.push(n);
        }
        const hist = b.build();
        render(n, hist);
      }
    };
  }

  createGroup(col: IDateColumn, context: IRenderContext) {
    const {template, render} = getHistDOMRenderer(col);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupDateStats(col, group).then((r) => {
          if (typeof r === 'symbol') {
            return;
          }
          const {group} = r;

          render(n, group);
        });
      }
    };
  }

  createSummary(col: IDateColumn, context: IRenderContext, interactive: boolean) {
    const r = getHistDOMRenderer(col);
    return staticSummary(col, context, interactive, r.template, r.render);
  }
}


function staticSummary(col: IDateColumn, context: IRenderContext, interactive: boolean, template: string, render: (n: HTMLElement, stats: IDateStatistics, unfiltered?: IDateStatistics) => void) {
  template += `<span class="${cssClass('mapping-hint')}"></span><span class="${cssClass('mapping-hint')}"></span>`;

  return {
    template: `${template}</div>`,
    update: (node: HTMLElement) => {
      return context.tasks.summaryDateStats(col).then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const {summary, data} = r;

        node.classList.toggle(cssClass('missing'), !summary);
        if (!summary) {
          return;
        }
        const range = [summary.min, summary.max].map((d) => col.getFormatter()(d));
        Array.from(node.getElementsByTagName('span')).forEach((d: HTMLElement, i) => d.textContent = range[i]);

        render(node, summary, interactive ? data: undefined);
      });
    }
  };
}


function getHistDOMRenderer(col: IDateColumn) {
  const ranking = col.findMyRanker();
  const guessedBins = ranking ? getNumberOfBins(ranking.getOrderLength()) : 10;

  const formatter = col.getFormatter();
  const color = colorOf(col)!;

  const render = (n: HTMLElement, stats: IDateStatistics, unfiltered?: IDateStatistics) => {
    return histogramRender(n, stats, unfiltered || null, formatter, () => color);
  };
  return {
    template: histogramTemplate(guessedBins),
    render,
    guessedBins
  };
}
