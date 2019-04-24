import {dateStatsBuilder, IDateStatistics} from '../internal';
import {Column, IDataRow, IDateColumn, IDatesColumn, IOrderedGroup, isDateColumn, isDatesColumn} from '../model';
import {cssClass} from '../styles';
import {ERenderMode, ICellRendererFactory, IRenderContext} from './interfaces';
import {renderMissingDOM} from './missing';
import {colorOf} from './utils';
import {histogramUpdate, histogramTemplate, mappingHintTemplate, mappingHintUpdate, IFilterInfo, IFilterContext, filteredHistTemplate, initFilter} from './histogram';
import InputDateDialog from '../ui/dialogs/InputDateDialog';
import {shiftFilterDateDay} from '../model/internalDate';

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
    return interactive ? interactiveSummary(col, context, r.template, r.render) : staticSummary(col, context, false, r.template, r.render);
  }
}


function staticSummary(col: IDateColumn, context: IRenderContext, interactive: boolean, template: string, render: (n: HTMLElement, stats: IDateStatistics, unfiltered?: IDateStatistics) => void) {
  template += mappingHintTemplate(['', '']);

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
        const formatter = col.getFormatter();
        mappingHintUpdate(node, [formatter(summary.min), formatter(summary.max)]);

        render(node, summary, interactive ? data: undefined);
      });
    }
  };
}


function interactiveSummary(col: IDateColumn, context: IRenderContext, template: string, render: (n: HTMLElement, stats: IDateStatistics, unfiltered?: IDateStatistics) => void) {
  const filter = col.getFilter();
  const dummyDomain: [number, number] = [isFinite(filter.min) ? filter.min : 0, isFinite(filter.max) ? filter.max : 100];

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
        const {summary, data} = r;
        if (!updateFilter) {
          fContext = createFilterContext(col, context, [data.min ? data.min.getTime() : Date.now(), data.max ? data.max.getTime() : Date.now()]);
          updateFilter = initFilter(node, fContext);
        }

        updateFilter(data ? data.missing : (summary ? summary.missing : 0), createFilterInfo(col, fContext.domain));

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
    guessedBins
  };
}

function createFilterInfo(col: IDateColumn, domain: [number, number]): IFilterInfo<number> {
  const filter = col.getFilter();
  const filterMin = isFinite(filter.min) ? filter.min : domain[0];
  const filterMax = isFinite(filter.max) ? filter.max : domain[1];
  return {
    filterMissing: filter.filterMissing,
    filterMin,
    filterMax
  };
}

function createFilterContext(col: IDateColumn, context: IRenderContext, domain: [number, number]): IFilterContext<number> {
  const percent = (v: number) => Math.round(100 * (v - domain[0]) / (domain[1] - domain[0]));
  const unpercent = (v: number) => ((v / 100) * (domain[1] - domain[0]) + domain[0]);
  return {
    percent,
    unpercent,
    domain,
    format: (v) => isNaN(v) ? '' : col.getFormatter()(new Date(v)),
    setFilter: (filterMissing, minValue, maxValue) => col.setFilter({
      filterMissing,
      min: Math.abs(minValue - domain[0]) < 0.001 ? NaN : shiftFilterDateDay(minValue, 'min'),
      max: Math.abs(maxValue - domain[1]) < 0.001 ? NaN : shiftFilterDateDay(maxValue, 'max')
    }),
    edit: (value, attachment, type) => {
      return new Promise((resolve) => {
        const dialogCtx = {
          attachment,
          manager: context.dialogManager,
          level: 1,
          idPrefix: context.idPrefix
        };
        const dialog = new InputDateDialog(dialogCtx, (d) => resolve(d == null ? NaN : shiftFilterDateDay(d.getTime(), type)), {value: isNaN(value) ? null : new Date(value)});
        dialog.open();
      });
    }
  };
}
