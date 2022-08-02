import { ICategoricalStatistics, round } from '../internal';
import {
  CategoricalColumn,
  Column,
  OrdinalColumn,
  ICategoricalColumn,
  isCategoricalColumn,
  IOrderedGroup,
  ISetColumn,
  DEFAULT_COLOR,
} from '../model';
import { filterMissingNumberMarkup } from '../ui/missing';
import { interactiveHist, HasCategoricalFilter } from './CategoricalCellRenderer';
import {
  IRenderContext,
  ERenderMode,
  ICellRendererFactory,
  ICellRenderer,
  IGroupCellRenderer,
  ISummaryRenderer,
} from './interfaces';
import { noRenderer, adaptTextColorToBgColor } from './utils';
import { cssClass, FILTERED_OPACITY } from '../styles';
import { color } from 'd3-color';

export default class CategoricalStackedDistributionlCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Distribution Bar';

  canRender(col: Column, mode: ERenderMode): boolean {
    return isCategoricalColumn(col) && mode !== ERenderMode.CELL;
  }

  create(): ICellRenderer {
    return noRenderer;
  }

  createGroup(col: ICategoricalColumn, context: IRenderContext): IGroupCellRenderer {
    const { template, update } = stackedBar(col, context.sanitize);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        const r = context.tasks.groupCategoricalStats(col, group);
        const isMissing = !r || r.group == null || r.group.count === 0 || r.group.count === r.group.missing;
        n.classList.toggle(cssClass('missing'), isMissing);
        if (isMissing) {
          return;
        }
        update(n, r.group);
      },
    };
  }

  createSummary(col: ICategoricalColumn, context: IRenderContext, interactive: boolean): ISummaryRenderer {
    return col instanceof CategoricalColumn || col instanceof OrdinalColumn
      ? interactiveSummary(col, context, interactive)
      : staticSummary(col, context);
  }
}

function staticSummary(col: ICategoricalColumn, context: IRenderContext) {
  const { template, update } = stackedBar(col, context.sanitize);
  return {
    template: `${template}</div>`,
    update: (n: HTMLElement) => {
      const r = context.tasks.summaryCategoricalStats(col);
      const isMissing = !r || r.summary == null || r.summary.count === 0 || r.summary.count === r.summary.missing;
      n.classList.toggle(cssClass('missing'), isMissing);
      if (isMissing) {
        return;
      }
      update(n, r.summary, r.data);
    },
  };
}

function interactiveSummary(col: HasCategoricalFilter, context: IRenderContext, interactive: boolean) {
  const { template, update } = stackedBar(col, context.sanitize);
  let filterUpdate: (missing: number, col: HasCategoricalFilter) => void;
  return {
    template: `${template}${interactive ? filterMissingNumberMarkup(false, 0) : ''}</div>`,
    update: (n: HTMLElement) => {
      if (!filterUpdate) {
        filterUpdate = interactiveHist(col, n);
      }
      const { summary, data } = context.tasks.summaryCategoricalStats(col);
      const missing = interactive && data ? data.missing : summary ? summary.missing : 0;
      filterUpdate(missing, col);

      const isMissing = summary == null || summary.count === 0 || summary.count === summary.missing;
      n.classList.toggle(cssClass('missing'), isMissing);
      if (isMissing) {
        return;
      }
      update(n, summary, data);
    },
  };
}

function selectedCol(value: string) {
  const c = color(value)!;
  c.opacity = FILTERED_OPACITY;
  return c.toString();
}

function stackedBar(col: ISetColumn, sanitize: (v: string) => string) {
  const s = sanitize;
  const mapping = col.getColorMapping();
  const cats = col.categories.map((c) => ({
    label: c.label,
    name: c.name,
    color: mapping.apply(c),
    selected: selectedCol(mapping.apply(c)),
  }));
  cats.push({ label: 'Missing Values', name: 'missing', color: DEFAULT_COLOR, selected: 'transparent' });

  const bins = cats
    .map(
      (c) =>
        `<div class="${cssClass('distribution-bar')}" style="background-color: ${s(
          c.color
        )}; color: ${adaptTextColorToBgColor(c.color)}" title="${s(c.label)}: 0" data-cat="${s(c.name)}"><span>${s(
          c.label
        )}</span></div>`
    )
    .join('');

  return {
    template: `<div>${bins}`, // no closing div to be able to append things
    update: (n: HTMLElement, hist: ICategoricalStatistics, gHist?: ICategoricalStatistics) => {
      const bins: { count: number }[] = hist.hist.slice();
      bins.push({ count: hist.missing });
      const children = Array.from(n.children) as HTMLElement[];

      if (!gHist) {
        const total = bins.reduce((acc, { count }) => acc + count, 0);

        for (let i = 0; i < cats.length; ++i) {
          const d = children[i];
          const count = bins[i].count;
          const label = cats[i].label;
          d.style.flexGrow = `${round(total === 0 ? 0 : count, 2)}`;
          d.title = `${label}: ${count}`;
        }
        return;
      }

      const gBins: { count: number }[] = gHist.hist.slice();
      gBins.push({ count: gHist.missing });
      const total = gBins.reduce((acc, { count }) => acc + count, 9);

      for (let i = 0; i < cats.length; ++i) {
        const d = children[i];
        const count = bins[i].count;
        const label = cats[i].label;
        const gCount = gBins[i].count;

        d.style.flexGrow = `${round(total === 0 ? 0 : gCount, 2)}`;
        d.title = `${label}: ${count} of ${gCount}`;
        const relY = 100 - round((count * 100) / gCount, 2);
        d.style.background =
          relY === 0
            ? cats[i].color
            : relY === 100
            ? cats[i].selected
            : `linear-gradient(${cats[i].selected} ${relY}%, ${cats[i].color} ${relY}%, ${cats[i].color} 100%)`;
      }
    },
  };
}
