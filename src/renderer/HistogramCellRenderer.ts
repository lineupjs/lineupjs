import { numberStatsBuilder, IStatistics, getNumberOfBins } from '../internal';
import {
  Column,
  IDataRow,
  IOrderedGroup,
  INumberColumn,
  INumbersColumn,
  isNumberColumn,
  isNumbersColumn,
  IMapAbleColumn,
  isMapAbleColumn,
  Ranking,
} from '../model';
import InputNumberDialog from '../ui/dialogs/InputNumberDialog';
import { colorOf } from './impose';
import {
  IRenderContext,
  ERenderMode,
  ICellRendererFactory,
  IImposer,
  IRenderTasks,
  ICellRenderer,
  IGroupCellRenderer,
  ISummaryRenderer,
} from './interfaces';
import { renderMissingDOM } from './missing';
import { cssClass, engineCssClass } from '../styles';
import {
  histogramUpdate,
  histogramTemplate,
  IHistogramLike,
  mappingHintTemplate,
  mappingHintUpdate,
  IFilterInfo,
  filteredHistTemplate,
  IFilterContext,
  initFilter,
} from './histogram';
import { noNumberFilter } from '../model/internalNumber';
import type DialogManager from '../ui/dialogs/DialogManager';

export default class HistogramCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Histogram';

  canRender(col: Column, mode: ERenderMode): boolean {
    return (isNumberColumn(col) && mode !== ERenderMode.CELL) || (isNumbersColumn(col) && mode === ERenderMode.CELL);
  }

  create(col: INumbersColumn, _context: IRenderContext, imposer?: IImposer): ICellRenderer {
    const { template, render, guessedBins } = getHistDOMRenderer(col, imposer);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, row: IDataRow) => {
        if (renderMissingDOM(n, col, row)) {
          return;
        }
        const b = numberStatsBuilder([0, 1], guessedBins);
        for (const n of col.getNumbers(row)) {
          b.push(n);
        }
        const hist = b.build();
        render(n, hist);
      },
    };
  }

  createGroup(col: INumberColumn, context: IRenderContext, imposer?: IImposer): IGroupCellRenderer {
    const { template, render } = getHistDOMRenderer(col, imposer);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupNumberStats(col, group).then((r) => {
          if (typeof r === 'symbol') {
            return;
          }
          const isMissing = !r || r.group == null || r.group.count === 0 || r.group.count === r.group.missing;
          n.classList.toggle(cssClass('missing'), isMissing);
          if (isMissing) {
            return;
          }

          const { summary, group } = r;
          render(n, group, summary);
        });
      },
    };
  }

  createSummary(
    col: INumberColumn,
    context: IRenderContext,
    interactive: boolean,
    imposer?: IImposer
  ): ISummaryRenderer {
    const r = getHistDOMRenderer(col, imposer);

    const staticHist = !interactive || !isMapAbleColumn(col);
    return staticHist
      ? staticSummary(col, context, r.template, r.render)
      : interactiveSummary(col as IMapAbleColumn, context, r.template, r.render);
  }
}

function staticSummary(
  col: INumberColumn,
  context: IRenderContext,
  template: string,
  render: (n: HTMLElement, stats: IStatistics, unfiltered?: IStatistics) => void
) {
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
        const isMissing = !r || r.summary == null || r.summary.count === 0 || r.summary.count === r.summary.missing;
        node.classList.toggle(cssClass('missing'), isMissing);
        if (isMissing) {
          return;
        }
        render(node, r.summary);
      });
    },
  };
}

function interactiveSummary(
  col: IMapAbleColumn,
  context: IRenderContext,
  template: string,
  render: (n: HTMLElement, stats: IStatistics, unfiltered?: IStatistics) => void
) {
  const fContext = createFilterContext(col, context);
  template += filteredHistTemplate(fContext, createFilterInfo(col));

  let updateFilter: (missing: number, f: IFilterInfo<number>) => void;

  return {
    template: `${template}</div>`,
    update: (node: HTMLElement) => {
      if (!updateFilter) {
        updateFilter = initFilter(node, fContext);
      }
      return context.tasks.summaryNumberStats(col, true /* raw */).then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const { summary, data } = r;

        updateFilter(data ? data.missing : summary ? summary.missing : 0, createFilterInfo(col));

        node.classList.add(cssClass('histogram-i'));
        node.classList.toggle(cssClass('missing'), !summary);
        if (!summary) {
          return;
        }
        render(node, summary, data);
      });
    },
  };
}

/** @internal */
export function createNumberFilter(
  col: INumberColumn & IMapAbleColumn,
  parent: HTMLElement,
  context: { idPrefix: string; dialogManager: DialogManager; tasks: IRenderTasks; sanitize: (v: string) => string },
  livePreviews: boolean
) {
  const renderer = getHistDOMRenderer(col);
  const fContext = createFilterContext(col, context);

  parent.innerHTML = `${renderer.template}${filteredHistTemplate(fContext, createFilterInfo(col))}</div>`;
  const summaryNode = parent.firstElementChild! as HTMLElement;
  summaryNode.classList.add(cssClass('summary'), cssClass('renderer'));
  summaryNode.dataset.renderer = 'histogram';
  summaryNode.dataset.interactive = '';
  summaryNode.classList.add(cssClass('histogram-i'));

  const applyFilter = fContext.setFilter;
  let currentFilter = createFilterInfo(col);
  fContext.setFilter = (filterMissing, min, max) => {
    currentFilter = { filterMissing, filterMin: min, filterMax: max };
    if (livePreviews) {
      applyFilter(filterMissing, min, max);
    }
  };

  const updateFilter = initFilter(summaryNode, fContext);

  const rerender = () => {
    const ready = context.tasks.summaryNumberStats(col, true /* raw */).then((r) => {
      if (typeof r === 'symbol') {
        return;
      }
      const { summary, data } = r;
      updateFilter(data ? data.missing : summary ? summary.missing : 0, currentFilter);
      summaryNode.classList.toggle(cssClass('missing'), !summary);
      if (!summary) {
        return;
      }
      renderer.render(summaryNode, summary, data);
    });
    if (!ready) {
      return;
    }
    summaryNode.classList.add(engineCssClass('loading'));
    ready.then(() => {
      summaryNode.classList.remove(engineCssClass('loading'));
    });
  };

  const ranking = col.findMyRanker()!;

  if (ranking) {
    ranking.on(`${Ranking.EVENT_ORDER_CHANGED}.numberFilter`, () => rerender());
  }
  rerender();

  return {
    cleanUp() {
      if (ranking) {
        ranking.on(`${Ranking.EVENT_ORDER_CHANGED}.numberFilter`, null);
      }
    },
    reset() {
      currentFilter = createFilterInfo(col, noNumberFilter());
      rerender();
    },
    submit() {
      applyFilter(currentFilter.filterMissing, currentFilter.filterMin, currentFilter.filterMax);
    },
  };
}

/** @internal */
export function getHistDOMRenderer(col: INumberColumn, imposer?: IImposer) {
  const ranking = col.findMyRanker();
  const guessedBins = ranking ? getNumberOfBins(ranking.getOrderLength()) : 10;
  const formatter = col.getNumberFormat();

  const render = (n: HTMLElement, stats: IHistogramLike<number>, unfiltered?: IHistogramLike<number>) => {
    return histogramUpdate(
      n,
      stats,
      unfiltered || null,
      formatter,
      (bin) => colorOf(col, null, imposer, (bin.x1 + bin.x0) / 2)!
    );
  };
  return {
    template: histogramTemplate(guessedBins),
    render,
    guessedBins,
  };
}

function createFilterInfo(col: IMapAbleColumn, filter = col.getFilter()): IFilterInfo<number> {
  const domain = col.getMapping().domain;
  const filterMin = isFinite(filter.min) ? filter.min : domain[0];
  const filterMax = isFinite(filter.max) ? filter.max : domain[1];
  return {
    filterMissing: filter.filterMissing,
    filterMin,
    filterMax,
  };
}

function createFilterContext(
  col: IMapAbleColumn,
  context: { idPrefix: string; dialogManager: DialogManager; sanitize: (v: string) => string }
): IFilterContext<number> {
  const domain = col.getMapping().domain;
  const format = col.getNumberFormat();
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const percent = (v: number) => clamp(Math.round((100 * (v - domain[0])) / (domain[1] - domain[0])));
  const unpercent = (v: number) => (v / 100) * (domain[1] - domain[0]) + domain[0];
  return {
    percent,
    unpercent,
    domain: domain as [number, number],
    format,
    formatRaw: String,
    parseRaw: Number.parseFloat,
    setFilter: (filterMissing, minValue, maxValue) =>
      col.setFilter({
        filterMissing,
        min: minValue === domain[0] ? Number.NEGATIVE_INFINITY : minValue,
        max: maxValue === domain[1] ? Number.POSITIVE_INFINITY : maxValue,
      }),
    edit: (value, attachment) => {
      return new Promise((resolve) => {
        const dialogCtx = {
          attachment,
          manager: context.dialogManager,
          level: context.dialogManager.maxLevel + 1,
          idPrefix: context.idPrefix,
          sanitize: context.sanitize,
        };
        const dialog = new InputNumberDialog(dialogCtx, resolve, {
          value,
          min: domain[0],
          max: domain[1],
        });
        dialog.open();
      });
    },
  };
}
