import { dateStatsBuilder, IDateStatistics } from '../internal';
import {
  Column,
  IDataRow,
  IDateColumn,
  IDatesColumn,
  IOrderedGroup,
  isDateColumn,
  isDatesColumn,
  Ranking,
} from '../model';
import { cssClass, engineCssClass } from '../styles';
import {
  ERenderMode,
  ICellRendererFactory,
  IRenderContext,
  ICellRenderer,
  IGroupCellRenderer,
  ISummaryRenderer,
  IRenderTasks,
} from './interfaces';
import { renderMissingDOM } from './missing';
import { colorOf } from './utils';
import {
  histogramUpdate,
  histogramTemplate,
  mappingHintTemplate,
  mappingHintUpdate,
  IFilterInfo,
  IFilterContext,
  filteredHistTemplate,
  initFilter,
} from './histogram';
import InputDateDialog from '../ui/dialogs/InputDateDialog';
import { shiftFilterDateDay, noDateFilter } from '../model/internalDate';
import type DialogManager from '../ui/dialogs/DialogManager';

export default class DateHistogramCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Histogram';

  canRender(col: Column, mode: ERenderMode): boolean {
    return (isDateColumn(col) && mode !== ERenderMode.CELL) || (isDatesColumn(col) && mode === ERenderMode.CELL);
  }

  create(col: IDatesColumn, _context: IRenderContext): ICellRenderer {
    const { template, render } = getHistDOMRenderer(col);
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
      },
    };
  }

  createGroup(col: IDateColumn, context: IRenderContext): IGroupCellRenderer {
    const { template, render } = getHistDOMRenderer(col);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupDateStats(col, group).then((r) => {
          if (typeof r === 'symbol') {
            return;
          }
          const isMissing = !r || r.group == null || r.group.count === 0 || r.group.count === r.group.missing;
          n.classList.toggle(cssClass('missing'), isMissing);
          if (isMissing) {
            return;
          }
          render(n, r.group);
        });
      },
    };
  }

  createSummary(col: IDateColumn, context: IRenderContext, interactive: boolean): ISummaryRenderer {
    const r = getHistDOMRenderer(col);
    return interactive
      ? interactiveSummary(col, context, r.template, r.render)
      : staticSummary(col, context, false, r.template, r.render);
  }
}

function staticSummary(
  col: IDateColumn,
  context: IRenderContext,
  interactive: boolean,
  template: string,
  render: (n: HTMLElement, stats: IDateStatistics, unfiltered?: IDateStatistics) => void
) {
  template += mappingHintTemplate(['', '']);

  return {
    template: `${template}</div>`,
    update: (node: HTMLElement) => {
      return context.tasks.summaryDateStats(col).then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const { summary, data } = r;

        node.classList.toggle(cssClass('missing'), !summary);
        if (!summary) {
          return;
        }
        const formatter = col.getFormatter();
        mappingHintUpdate(node, [formatter(summary.min), formatter(summary.max)]);

        render(node, summary, interactive ? data : undefined);
      });
    },
  };
}

function interactiveSummary(
  col: IDateColumn,
  context: IRenderContext,
  template: string,
  render: (n: HTMLElement, stats: IDateStatistics, unfiltered?: IDateStatistics) => void
) {
  const filter = col.getFilter();
  const dummyDomain: [number, number] = [
    isFinite(filter.min) ? filter.min : 0,
    isFinite(filter.max) ? filter.max : 100,
  ];

  template += filteredHistTemplate(createFilterContext(col, context, dummyDomain), createFilterInfo(col, dummyDomain));

  let fContext: IFilterContext<number>;
  let updateFilter: (missing: number, f: IFilterInfo<number>) => void;

  return {
    template: `${template}</div>`,
    update: (node: HTMLElement) => {
      return context.tasks.summaryDateStats(col).then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const { summary, data } = r;
        if (!updateFilter) {
          const domain: [number, number] = [
            data.min ? data.min.getTime() : Date.now(),
            data.max ? data.max.getTime() : Date.now(),
          ];
          fContext = createFilterContext(col, context, domain);
          updateFilter = initFilter(node, fContext);
        }

        updateFilter(data ? data.missing : summary ? summary.missing : 0, createFilterInfo(col, fContext.domain));

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
export function createDateFilter(
  col: IDateColumn,
  parent: HTMLElement,
  context: { idPrefix: string; dialogManager: DialogManager; tasks: IRenderTasks; sanitize: (v: string) => string },
  livePreviews: boolean
) {
  const renderer = getHistDOMRenderer(col);
  const filter = col.getFilter();

  let domain: [number, number] = [isFinite(filter.min) ? filter.min : 0, isFinite(filter.max) ? filter.max : 100];

  let fContext = createFilterContext(col, context, domain);
  let applyFilter = fContext.setFilter;
  let currentFilter = createFilterInfo(col, domain);
  fContext.setFilter = (filterMissing, min, max) => {
    currentFilter = { filterMissing, filterMin: min, filterMax: max };
    if (livePreviews) {
      applyFilter(filterMissing, min, max);
    }
  };
  parent.innerHTML = `${renderer.template}${filteredHistTemplate(fContext, createFilterInfo(col, domain))}</div>`;
  const summaryNode = parent.firstElementChild! as HTMLElement;
  summaryNode.classList.add(cssClass('summary'), cssClass('renderer'));
  summaryNode.dataset.renderer = 'histogram';
  summaryNode.dataset.interactive = '';
  summaryNode.classList.add(cssClass('histogram-i'));

  let updateFilter: null | ((missing: number, filter: IFilterInfo<number>) => void) = null;
  const prepareRender = (min: Date | null, max: Date | null) => {
    // reinit with proper domain
    domain = [min ? min.getTime() : Date.now(), max ? max.getTime() : Date.now()];
    fContext = createFilterContext(col, context, domain);
    applyFilter = fContext.setFilter;
    currentFilter = createFilterInfo(col, domain);
    fContext.setFilter = (filterMissing, min, max) => {
      currentFilter = { filterMissing, filterMin: min, filterMax: max };
      if (livePreviews) {
        applyFilter(filterMissing, min, max);
      }
    };
    return initFilter(summaryNode, fContext);
  };

  const rerender = () => {
    const ready = context.tasks.summaryDateStats(col).then((r) => {
      if (typeof r === 'symbol') {
        return;
      }
      const { summary, data } = r;
      if (!updateFilter) {
        updateFilter = prepareRender(data.min, data.max);
      }
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
      currentFilter = createFilterInfo(col, domain, noDateFilter());
      rerender();
    },
    submit() {
      applyFilter(currentFilter.filterMissing, currentFilter.filterMin, currentFilter.filterMax);
    },
  };
}

function getHistDOMRenderer(col: IDateColumn) {
  const guessedBins = 10;

  const formatter = col.getFormatter();
  const color = colorOf(col)!;

  const render = (n: HTMLElement, stats: IDateStatistics, unfiltered?: IDateStatistics) => {
    return histogramUpdate(n, stats, unfiltered || null, formatter, () => color);
  };
  return {
    template: histogramTemplate(guessedBins),
    render,
    guessedBins,
  };
}

function createFilterInfo(col: IDateColumn, domain: [number, number], filter = col.getFilter()): IFilterInfo<number> {
  const filterMin = isFinite(filter.min) ? filter.min : domain[0];
  const filterMax = isFinite(filter.max) ? filter.max : domain[1];
  return {
    filterMissing: filter.filterMissing,
    filterMin,
    filterMax,
  };
}

function createFilterContext(
  col: IDateColumn,
  context: { idPrefix: string; dialogManager: DialogManager; sanitize: (v: string) => string },
  domain: [number, number]
): IFilterContext<number> {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const percent = (v: number) => clamp(Math.round((100 * (v - domain[0])) / (domain[1] - domain[0])));
  const unpercent = (v: number) => (v / 100) * (domain[1] - domain[0]) + domain[0];
  return {
    percent,
    unpercent,
    domain,
    format: (v) => (Number.isNaN(v) ? '' : col.getFormatter()(new Date(v))),
    formatRaw: String,
    parseRaw: (v) => Number.parseInt(v, 10),
    setFilter: (filterMissing, minValue, maxValue) =>
      col.setFilter({
        filterMissing,
        min: Math.abs(minValue - domain[0]) < 0.001 ? Number.NEGATIVE_INFINITY : shiftFilterDateDay(minValue, 'min'),
        max: Math.abs(maxValue - domain[1]) < 0.001 ? Number.POSITIVE_INFINITY : shiftFilterDateDay(maxValue, 'max'),
      }),
    edit: (value, attachment, type) => {
      return new Promise((resolve) => {
        const dialogCtx = {
          attachment,
          manager: context.dialogManager,
          level: context.dialogManager.maxLevel + 1,
          idPrefix: context.idPrefix,
          sanitize: context.sanitize,
        };
        const dialog = new InputDateDialog(
          dialogCtx,
          (d) => resolve(d == null ? NaN : shiftFilterDateDay(d.getTime(), type)),
          { value: Number.isNaN(value) ? null : new Date(value) }
        );
        dialog.open();
      });
    },
  };
}
