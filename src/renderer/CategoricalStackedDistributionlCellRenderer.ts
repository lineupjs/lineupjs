import {computeHist, ICategoricalBin, ICategoricalStatistics} from '../internal/math';
import {ICategoricalColumn, IDataRow, IGroup, isCategoricalColumn} from '../model';
import CategoricalColumn from '../model/CategoricalColumn';
import Column from '../model/Column';
import OrdinalColumn from '../model/OrdinalColumn';
import {filterMissingNumberMarkup} from '../ui/missing';
import {interactiveHist} from './CategoricalCellRenderer';
import {default as IRenderContext, ERenderMode, ICellRendererFactory} from './interfaces';
import {forEachChild, noRenderer, adaptTextColorToBgColor} from './utils';
import {cssClass} from '../styles';

/** @internal */
export default class CategoricalStackedDistributionlCellRenderer implements ICellRendererFactory {
  readonly title = 'Distribution Bar';

  canRender(col: Column, mode: ERenderMode) {
    return isCategoricalColumn(col) && mode !== ERenderMode.CELL;
  }

  create() {
    return noRenderer;
  }


  createGroup(col: ICategoricalColumn) {
    const { template, update } = stackedBar(col);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const { hist, missing } = computeHist(rows, (r: IDataRow) => col.getCategory(r), col.categories);
        update(n, hist, missing);
      }
    };
  }

  createSummary(col: ICategoricalColumn, ctx: IRenderContext, interactive: boolean) {
    return (col instanceof CategoricalColumn || col instanceof OrdinalColumn) ? interactiveSummary(col, interactive, ctx.idPrefix) : staticSummary(col);
  }
}

function staticSummary(col: ICategoricalColumn) {
  const { template, update } = stackedBar(col);
  return {
    template: `${template}</div>`,
    update: (n: HTMLElement, hist: ICategoricalStatistics | null) => {
      n.classList.toggle(cssClass('missing'), !hist);
      if (!hist) {
        return;
      }
      update(n, hist.hist, hist.missing);
    }
  };
}

function interactiveSummary(col: CategoricalColumn | OrdinalColumn, interactive: boolean, idPrefix: string) {
  const { template, update } = stackedBar(col);
  let filterUpdate: (missing: number, col: CategoricalColumn | OrdinalColumn) => void;
  return {
    template: `${template}${interactive ? filterMissingNumberMarkup(false, 0, idPrefix) : ''}</div>`,
    update: (n: HTMLElement, hist: ICategoricalStatistics | null) => {
      if (!filterUpdate) {
        filterUpdate = interactiveHist(col, n);
      }
      filterUpdate(hist ? hist.missing : 0, col);

      n.classList.toggle(cssClass('missing'), !hist);
      if (!hist) {
        return;
      }
      update(n, hist.hist, hist.missing);
    }
  };
}

function stackedBar(col: ICategoricalColumn) {
  const cats = col.categories;
  const bins = cats.map((c) => `<div class="${cssClass('distribution-bar')}" style="background-color: ${c.color}; color: ${adaptTextColorToBgColor(c.color)}" title="${c.label}: 0" data-cat="${c.name}"><span>${c.label}</span></div>`).join('');

  return {
    template: `<div>${bins}<div title="Missing Values"></div>`, // no closing div to be able to append things
    update: (n: HTMLElement, hist: ICategoricalBin[], missing: number) => {
      const total = hist.reduce((acc, { y }) => acc + y, missing);
      forEachChild(n, (d: HTMLElement, i) => {
        let y: number;
        let label: string;
        if (i >= hist.length) {
          y = missing;
          label = 'Missing Values';
        } else {
          y = hist[i].y;
          label = cats[i].label;
        }
        d.style.flexGrow = `${Math.round(total === 0 ? 0 : y)}`;
        d.title = `${label}: ${y}`;
      });
    }
  };
}
