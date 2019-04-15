import {normalizedStatsBuilder, IStatistics, round, getNumberOfBins} from '../internal';
import {Column, IDataRow, IOrderedGroup, INumberColumn, INumbersColumn, isNumberColumn, isNumbersColumn, IMapAbleColumn, isMapAbleColumn} from '../model';
import InputNumberDialog from '../ui/dialogs/InputNumberDialog';
import {colorOf} from './impose';
import {IRenderContext, ERenderMode, ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingDOM} from './missing';
import {cssClass} from '../styles';
import {histogramUpdate, histogramTemplate, IHistogramLike, mappingHintTemplate, mappingHintUpdate, IFilterInfo, filteredHistTemplate, IFilterContext, initFilter} from './histogram';

/** @internal */
export default class HistogramCellRenderer implements ICellRendererFactory {
  readonly title = 'Histogram';

  canRender(col: Column, mode: ERenderMode) {
    return (isNumberColumn(col) && mode !== ERenderMode.CELL) || (isNumbersColumn(col) && mode === ERenderMode.CELL);
  }

  create(col: INumbersColumn, _context: IRenderContext, imposer?: IImposer) {
    const {template, render, guessedBins} = getHistDOMRenderer(col, imposer);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, row: IDataRow) => {
        if (renderMissingDOM(n, col, row)) {
          return;
        }
        const b = normalizedStatsBuilder(guessedBins);
        for (const n of col.getNumbers(row)) {
          b.push(n);
        }
        const hist = b.build();
        render(n, hist);
      }
    };
  }

  createGroup(col: INumberColumn, context: IRenderContext, imposer?: IImposer) {
    const {template, render} = getHistDOMRenderer(col, imposer);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupNumberStats(col, group).then((r) => {
          if (typeof r === 'symbol') {
            return;
          }
          const {summary, group} = r;

          render(n, group, summary);
        });
      }
    };
  }

  createSummary(col: INumberColumn, context: IRenderContext, interactive: boolean, imposer?: IImposer) {
    const r = getHistDOMRenderer(col, imposer);

    const staticHist = !interactive || !isMapAbleColumn(col);
    return staticHist ? staticSummary(col, context, r.template, r.render) : interactiveSummary(<IMapAbleColumn>col, context, r.template, r.render);
  }
}


function staticSummary(col: INumberColumn, context: IRenderContext, template: string, render: (n: HTMLElement, stats: IStatistics, unfiltered?: IStatistics) => void) {
  if (isMapAbleColumn(col)) {
    template += mappingHintTemplate(col.getRange());
  }
  return {
    template: `${template}</div>`,
    update: (node: HTMLElement) => {
      if (isMapAbleColumn(col)) {
        mappingHintUpdate(node, col.getRange());
      }

      return context.tasks.summaryNumberStats(col).then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const {summary} = r;

        node.classList.toggle(cssClass('missing'), !summary);
        if (!summary) {
          return;
        }
        render(node, summary);
      });
    }
  };
}

function interactiveSummary(col: IMapAbleColumn, context: IRenderContext, template: string, render: (n: HTMLElement, stats: IStatistics, unfiltered?: IStatistics) => void) {
  const fContext = createFilterContext(col, context);
  template += filteredHistTemplate(fContext, createFilterInfo(col));

  let updateFilter: (missing: number, f: IFilterInfo<number>) => void;

  return {
    template: `${template}</div>`,
    update: (node: HTMLElement) => {
      if (!updateFilter) {
        updateFilter = initFilter(node, fContext);
      }
      return context.tasks.summaryNumberStats(col).then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const {summary, data} = r;

        updateFilter(data ? data.missing : (summary ? summary.missing : 0), createFilterInfo(col));

        node.classList.add(cssClass('histogram-i'));
        node.classList.toggle(cssClass('missing'), !summary);
        if (!summary) {
          return;
        }
        render(node, summary, data);
      });
    }
  };
}

/** @internal */
export function getHistDOMRenderer(col: INumberColumn, imposer?: IImposer) {
  const ranking = col.findMyRanker();
  const guessedBins = ranking ? getNumberOfBins(ranking.getOrderLength()) : 10;
  const formatter = col.getNumberFormat();

  const render = (n: HTMLElement, stats: IHistogramLike<number>, unfiltered?: IHistogramLike<number>) => {
    return histogramUpdate(n, stats, unfiltered || null, formatter, (bin) => colorOf(col, null, imposer, (bin.x1 + bin.x0) / 2)!);
  };
  return {
    template: histogramTemplate(guessedBins),
    render,
    guessedBins
  };
}

function createFilterInfo(col: IMapAbleColumn): IFilterInfo<number> {
  const filter = col.getFilter();
  const domain = col.getMapping().domain;
  const filterMin = isFinite(filter.min) ? filter.min : domain[0];
  const filterMax = isFinite(filter.max) ? filter.max : domain[1];
  return {
    filterMissing: filter.filterMissing,
    filterMin,
    filterMax
  };
}

function createFilterContext(col: IMapAbleColumn, context: IRenderContext): IFilterContext<number> {
  const domain = col.getMapping().domain;
  const percent = (v: number) => Math.round(100 * (v - domain[0]) / (domain[1] - domain[0]));
  const unpercent = (v: number) => ((v / 100) * (domain[1] - domain[0]) + domain[0]);
  return {
    percent,
    unpercent,
    domain: <[number, number]>domain,
    format: (v) => round(v, 2).toString(),
    setFilter: (filterMissing, minValue, maxValue) => col.setFilter({
      filterMissing,
      min: Math.abs(minValue - domain[0]) < 0.001 ? NaN : minValue,
      max: Math.abs(maxValue - domain[1]) < 0.001 ? NaN : maxValue
    }),
    edit: (value, attachment) => {
      return new Promise((resolve) => {
        const dialogCtx = {
          attachment,
          manager: context.dialogManager,
          level: 1,
          idPrefix: context.idPrefix
        };
        const dialog = new InputNumberDialog(dialogCtx, resolve, {
            value, min: domain[0], max: domain[1]
          });
        dialog.open();
      });
    }
  };
}
