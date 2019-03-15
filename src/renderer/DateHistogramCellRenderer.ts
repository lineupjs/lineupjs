import {dateStatsBuilder, getNumberOfBins, IDateStatistics} from '../internal';
import {Column, IDataRow, IDateColumn, IDatesColumn, IOrderedGroup, isDateColumn, isDatesColumn, DateColumn} from '../model';
import {cssClass} from '../styles';
import {ERenderMode, ICellRendererFactory, IRenderContext} from './interfaces';
import {renderMissingDOM} from './missing';
import {colorOf} from './utils';
import {histogramUpdate, histogramTemplate, mappingHintTemplate, mappingHintUpdate, IFilterInfo, IFilterContext} from './histogram';
import InputDateDialog from '../ui/dialogs/InputDateDialog';

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

function createFilterInfo(col: IDateColumn, domain: [Date, Date]): IFilterInfo<number> {
  const filter = col.getFilter();
  const filterMin = isFinite(filter.min) ? filter.min : domain[0];
  const filterMax = isFinite(filter.max) ? filter.max : domain[1];
  return {
    filterMissing: filter.filterMissing,
    filterMin,
    filterMax
  };
}

function createFilterContext(col: IDateColumn, domain: [Date, Date], context: IRenderContext): IFilterContext<number> {
  const percent = (v: Date | null) => Math.round(100 * (v - domain[0]) / (domain[1] - domain[0]));
  const unpercent = (v: Date | null) => ((v / 100) * (domain[1] - domain[0]) + domain[0]);
  return {
    percent,
    unpercent,
    format: col.getFormatter.bind(col),
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
        const dialog = new InputDateDialog(dialogCtx, resolve, {value});
        dialog.open();
      });
    }
  };
}
