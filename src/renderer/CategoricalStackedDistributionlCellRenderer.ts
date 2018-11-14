import {computeHist, ICategoricalBin, ICategoricalStatistics, round} from '../internal/math';
import {ICategoricalColumn, IDataRow, IGroup, isCategoricalColumn} from '../model';
import CategoricalColumn from '../model/CategoricalColumn';
import Column from '../model/Column';
import OrdinalColumn from '../model/OrdinalColumn';
import {filterMissingNumberMarkup} from '../ui/missing';
import {interactiveHist} from './CategoricalCellRenderer';
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

  createSummary(col: ICategoricalColumn, ctx: IRenderContext, interactive: boolean, unfilteredHist: ICategoricalStatistics | null) {
    return (col instanceof CategoricalColumn || col instanceof OrdinalColumn) ? interactiveSummary(col, interactive, unfilteredHist, ctx.idPrefix) : staticSummary(col);
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

function interactiveSummary(col: CategoricalColumn | OrdinalColumn, interactive: boolean, unfilteredHist: ICategoricalStatistics | null, idPrefix: string) {
  const { template, update } = stackedBar(col, unfilteredHist);
  let filterUpdate: (missing: number, col: CategoricalColumn | OrdinalColumn) => void;
  return {
    template: `${template}${interactive ? filterMissingNumberMarkup(false, 0, idPrefix) : ''}</div>`,
    update: (n: HTMLElement, hist: ICategoricalStatistics | null) => {
      if (!filterUpdate) {
        filterUpdate = interactiveHist(col, n);
      }
      const missing = interactive && unfilteredHist ? unfilteredHist.missing : (hist ? hist.missing : 0);
      filterUpdate(missing, col);

      n.classList.toggle(cssClass('missing'), !hist);
      if (!hist) {
        return;
      }
      update(n, hist.hist, hist.missing);
    }
  };
}

function selectedCol(value: string) {
  const c = color(value)!;
  c.opacity = FILTERED_OPACITY;
  return c.toString();
}

function stackedBar(col: ICategoricalColumn, unfilteredHist?: ICategoricalStatistics | null) {
  const cats = col.categories.map((c) => ({
    label: c.label,
    color: c.color,
    selected: selectedCol(c.color)
  }));
  cats.push({label: 'Missing Values', color: Column.DEFAULT_COLOR, selected: 'transparent'});

  const bins = col.categories.map((c) => `<div class="${cssClass('distribution-bar')}" style="background-color: ${c.color}; color: ${adaptTextColorToBgColor(c.color)}" title="${c.label}: 0" data-cat="${c.name}"><span>${c.label}</span></div>`).join('');

  const updateSingle = (n: HTMLElement, hist: ICategoricalBin[], missing: number) => {
    const total = hist.reduce((acc, { y }) => acc + y, missing);

    forEachChild(n, (d: HTMLElement, i) => {
      const y = i >= hist.length ? missing : hist[i].y;
      const label = cats[i].label;
      d.style.flexGrow = `${round(total === 0 ? 0 : y, 2)}`;
      d.title = `${label}: ${y}`;
    });
  };

  const updateUnfiltered = (n: HTMLElement, hist: ICategoricalBin[], missing: number) => {
    const uf = unfilteredHist!;
    const total = uf.hist.reduce((acc, { y }) => acc + y, uf.missing);

    forEachChild(n, (d: HTMLElement, i) => {
      const y = i >= hist.length ? missing : hist[i].y;
      const label = cats[i].label;
      const gY = i >= hist.length ? uf.missing : uf.hist[i].y;

      d.style.flexGrow = `${round(total === 0 ? 0 : gY, 2)}`;
      d.title = `${label}: ${y} of ${gY}`;
      const relY = 100 - round(y * 100 / gY, 2);
      d.style.background = relY === 0 ? cats[i].color : (relY === 100 ? cats[i].selected : `linear-gradient(${cats[i].selected} ${relY}%, ${cats[i].color} ${relY}%, ${cats[i].color} 100%)`);
    });
  };

  return {
    template: `<div>${bins}<div title="Missing Values"></div>`, // no closing div to be able to append things
    update: unfilteredHist ? updateUnfiltered : updateSingle
  };
}
