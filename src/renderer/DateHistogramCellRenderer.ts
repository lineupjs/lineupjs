import {DENSE_HISTOGRAM} from '../constants';
import {dateStatsBuilder, getNumberOfBins, IDateStatistics, round} from '../internal';
import {Column, IDataRow, IDateColumn, IDatesColumn, IOrderedGroup, isDateColumn, isDatesColumn} from '../model';
import {cssClass} from '../styles';
import {ERenderMode, ICellRendererFactory, IRenderContext} from './interfaces';
import {renderMissingDOM} from './missing';
import {colorOf} from './utils';

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

  createSummary(col: IDateColumn, context: IRenderContext) {
    const r = getHistDOMRenderer(col);
    return staticSummary(col, context, r.template, r.render);
  }
}


function staticSummary(col: IDateColumn, context: IRenderContext, template: string, render: (n: HTMLElement, stats: IDateStatistics) => void) {
  template += `<span class="${cssClass('mapping-hint')}"></span><span class="${cssClass('mapping-hint')}"></span>`;

  return {
    template: `${template}</div>`,
    update: (node: HTMLElement) => {
      return context.tasks.summaryDateStats(col).then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const {summary} = r;

        node.classList.toggle(cssClass('missing'), !summary);
        if (!summary) {
          return;
        }
        const range = [summary.min, summary.max].map((d) => col.getFormatter()(d));
        Array.from(node.getElementsByTagName('span')).forEach((d: HTMLElement, i) => d.textContent = range[i]);

        render(node, summary);
      });
    }
  };
}


/** @internal */
export function getHistDOMRenderer(col: IDateColumn) {
  const ranking = col.findMyRanker();
  const guessedBins = ranking ? getNumberOfBins(ranking.getOrderLength()) : 10;
  let bins = '';
  for (let i = 0; i < guessedBins; ++i) {
    bins += `<div class="${cssClass('histogram-bin')}" title="Bin ${i}: 0" data-x=""><div style="height: 0" ></div></div>`;
  }

  const formatter = col.getFormatter();

  const render = (n: HTMLElement, stats: IDateStatistics) => {
    const {maxBin, hist} = stats;
    const bins = hist.length;
    //adapt the number of children
    let nodes = <HTMLElement[]>Array.from(n.querySelectorAll('[data-x]'));
    if (nodes.length > hist.length) {
      nodes.splice(bins, nodes.length - bins).forEach((d) => d.remove());
    } else if (nodes.length < bins) {
      for (let i = nodes.length; i < bins; ++i) {
        n.insertAdjacentHTML('afterbegin', `<div class="${cssClass('histogram-bin')}" title="Bin ${i}: 0" data-x=""><div style="height: 0" ></div></div>`);
      }
      nodes = Array.from(n.querySelectorAll('[data-x]'));
    }
    n.classList.toggle(cssClass('dense'), bins > DENSE_HISTOGRAM);
    nodes.forEach((d: HTMLElement, i) => {
      const {x0, x1, count} = hist[i];
      const inner = <HTMLElement>d.firstElementChild!;
      d.dataset.x = String(x0.getTime());
      d.title = `${formatter(x0)} - ${formatter(x1)} (${count})`;
      inner.style.height = `${round(count * 100 / maxBin, 2)}%`;
      inner.style.background = colorOf(col);
    });
  };
  return {
    template: `<div class="${cssClass('histogram')} ${guessedBins > DENSE_HISTOGRAM ? cssClass('dense') : ''}">${bins}`, // no closing div to be able to append things
    render,
    guessedBins
  };
}
