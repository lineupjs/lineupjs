import {ICategoricalStatistics, round} from '../internal/math';
import {ICategoricalColumn, isCategoricalColumn, IOrderedGroup, ISetColumn} from '../model';
import CategoricalColumn from '../model/CategoricalColumn';
import Column from '../model/Column';
import OrdinalColumn from '../model/OrdinalColumn';
import {filterMissingNumberMarkup} from '../ui/missing';
import {interactiveHist, HasCategoricalFilter} from './CategoricalCellRenderer';
import {default as IRenderContext, ERenderMode, ICellRendererFactory} from './interfaces';
import {forEachChild, noRenderer, adaptTextColorToBgColor} from './utils';
import {cssClass, FILTERED_OPACITY} from '../styles';
import {color} from 'd3-color';

/** @internal */
export default class CategoricalStackedDistributionlCellRenderer implements ICellRendererFactory {
  readonly title = 'Distribution Bar';

  canRender(col: Column, mode: ERenderMode) {
    return isCategoricalColumn(col) && mode !== ERenderMode.CELL;
  }

  create() {
    return noRenderer;
  }

  createGroup(col: ICategoricalColumn, context: IRenderContext) {
    const {template, update} = stackedBar(col);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupCategoricalStats(col, group).then((r) => {
          if (typeof r === 'symbol') {
            return;
          }
          const {summary, group} = r;

          update(n, group, summary);
        });
      }
    };
  }

  createSummary(col: ICategoricalColumn, context: IRenderContext, interactive: boolean) {
    return (col instanceof CategoricalColumn || col instanceof OrdinalColumn) ? interactiveSummary(col, context, interactive) : staticSummary(col, context);
  }
}

function staticSummary(col: ICategoricalColumn, context: IRenderContext) {
  const {template, update} = stackedBar(col);
  return {
    template: `${template}</div>`,
    update: (n: HTMLElement) => {
      return context.tasks.summaryCategoricalStats(col).then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const {summary} = r;

        n.classList.toggle(cssClass('missing'), !summary);
        if (!summary) {
          return;
        }
        update(n, summary);
      });
    }
  };
}

function interactiveSummary(col: HasCategoricalFilter, context: IRenderContext, interactive: boolean) {
  const {template, update} = stackedBar(col);
  let filterUpdate: (missing: number, col: HasCategoricalFilter) => void;
  return {
    template: `${template}${interactive ? filterMissingNumberMarkup(false, 0, context.idPrefix) : ''}</div>`,
    update: (n: HTMLElement) => {
      if (!filterUpdate) {
        filterUpdate = interactiveHist(col, n);
      }
      return context.tasks.summaryCategoricalStats(col).then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const {summary, data} = r;

        const missing = interactive && data ? data.missing : (summary ? summary.missing : 0);
        filterUpdate(missing, col);

        n.classList.toggle(cssClass('missing'), !summary);
        if (!summary) {
          return;
        }
        update(n, summary);
      });
    }
  };
}

function selectedCol(value: string) {
  const c = color(value)!;
  c.opacity = FILTERED_OPACITY;
  return c.toString();
}

function stackedBar(col: ISetColumn) {
  const mapping = col.getColorMapping();
  const cats = col.categories.map((c) => ({
    label: c.label,
    name: c.name,
    color: mapping.apply(c),
    selected: selectedCol(mapping.apply(c))
  }));
  cats.push({label: 'Missing Values', name: 'missing', color: Column.DEFAULT_COLOR, selected: 'transparent'});

  const bins = cats.map((c) => `<div class="${cssClass('distribution-bar')}" style="background-color: ${c.color}; color: ${adaptTextColorToBgColor(c.color)}" title="${c.label}: 0" data-cat="${c.name}"><span>${c.label}</span></div>`).join('');

  return {
    template: `<div>${bins}<div title="Missing Values"></div>`, // no closing div to be able to append things
    update: (n: HTMLElement, hist: ICategoricalStatistics, gHist?: ICategoricalStatistics) => {
      if (!gHist) {
        const total = hist.hist.reduce((acc, {count}) => acc + count, hist.missing);

        forEachChild(n, (d: HTMLElement, i) => {
          const count = i >= hist.hist.length ? hist.missing : hist.hist[i].count;
          const label = i >= cats.length ? 'Missing Values' : cats[i].label;
          d.style.flexGrow = `${round(total === 0 ? 0 : count, 2)}`;
          d.title = `${label}: ${count}`;
        });
        return;
      }

      const total = gHist.hist.reduce((acc, {count}) => acc + count, gHist.missing);

      forEachChild(n, (d: HTMLElement, i) => {
        const count = i >= hist.hist.length ? hist.missing : hist.hist[i].count;
        const label = i >= hist.hist.length ? 'Missing Values' : cats[i].label;
        const gCount = i >= hist.hist.length ? gHist.missing : gHist.hist[i].count;

        d.style.flexGrow = `${round(total === 0 ? 0 : gCount, 2)}`;
        d.title = `${label}: ${count} of ${gCount}`;
        const relY = 100 - round(count * 100 / gCount, 2);
        d.style.background = relY === 0 ? cats[i].color : (relY === 100 ? cats[i].selected : `linear-gradient(${cats[i].selected} ${relY}%, ${cats[i].color} ${relY}%, ${cats[i].color} 100%)`);
      });
    }
  };
}
