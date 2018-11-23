import {DENSE_HISTOGRAM} from '../config';
import {computeHist, ICategoricalBin, ICategoricalStatistics, round} from '../internal/math';
import {ICategoricalColumn, IDataRow, IGroup, isCategoricalColumn} from '../model';
import CategoricalColumn from '../model/CategoricalColumn';
import Column from '../model/Column';
import {isCategoryIncluded} from '../model/ICategoricalColumn';
import OrdinalColumn from '../model/OrdinalColumn';
import {CANVAS_HEIGHT, cssClass, FILTERED_OPACITY} from '../styles';
import {filterMissingNumberMarkup, updateFilterMissingNumberMarkup} from '../ui/missing';
import {default as IRenderContext, ICellRendererFactory} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {setText, wideEnough, forEach} from './utils';
import {color} from 'd3-color';

/** @internal */
export default class CategoricalCellRenderer implements ICellRendererFactory {
  readonly title = 'Color';
  readonly groupTitle = 'Histogram';

  canRender(col: Column) {
    return isCategoricalColumn(col);
  }

  create(col: ICategoricalColumn, context: IRenderContext) {
    const width = context.colWidth(col);
    return {
      template: `<div>
        <div class="${cssClass('cat-color')}"></div><div class="${cssClass('cat-label')}"></div>
      </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        const v = col.getCategory(d);
        (<HTMLDivElement>n.firstElementChild!).style.backgroundColor = v ? col.getColor(d) : null;
        setText(<HTMLSpanElement>n.lastElementChild!, col.getLabel(d));
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        const v = col.getCategory(d);
        ctx.fillStyle = v ? col.getColor(d) : '';
        ctx.fillRect(0, 0, width, CANVAS_HEIGHT);
      }
    };
  }

  createGroup(col: ICategoricalColumn, _context: IRenderContext, globalHist: ICategoricalStatistics | null) {
    const {template, update} = hist(col, false, null);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const {maxBin, hist} = computeHist(rows, (r: IDataRow) => col.getCategory(r), col.categories);

        const max = Math.max(maxBin, globalHist ? globalHist.maxBin : 0);
        update(n, max, hist);
      }
    };
  }

  createSummary(col: ICategoricalColumn, ctx: IRenderContext, interactive: boolean, unfilteredHist: ICategoricalStatistics | null) {
    return (col instanceof CategoricalColumn || col instanceof OrdinalColumn) ? interactiveSummary(col, interactive, unfilteredHist, ctx.idPrefix) : staticSummary(col, interactive);
  }
}

function staticSummary(col: ICategoricalColumn, interactive: boolean) {
  const {template, update} = hist(col, interactive, null);
  return {
    template: `${template}</div>`,
    update: (n: HTMLElement, hist: ICategoricalStatistics | null) => {
      n.classList.toggle(cssClass('missing'), !hist);
      if (!hist) {
        return;
      }
      update(n, hist.maxBin, hist.hist);
    }
  };
}

function interactiveSummary(col: CategoricalColumn | OrdinalColumn, interactive: boolean, unfilteredHist: ICategoricalStatistics | null, idPrefix: string) {
  const {template, update} = hist(col, interactive || wideEnough(col), interactive ? unfilteredHist : null);
  let filterUpdate: (missing: number, col: CategoricalColumn | OrdinalColumn) => void;
  return {
    template: `${template}${interactive ? filterMissingNumberMarkup(false, 0, idPrefix) : ''}</div>`,
    update: (n: HTMLElement, hist: ICategoricalStatistics | null) => {
      if (!filterUpdate) {
        filterUpdate = interactiveHist(col, n);
      }
      filterUpdate((interactive && unfilteredHist) ? unfilteredHist.missing : (hist ? hist.missing : 0), col);

      n.classList.toggle(cssClass('missing'), !hist);
      if (!hist) {
        return;
      }
      update(n, hist.maxBin, hist.hist);
    }
  };
}

function hist(col: ICategoricalColumn, showLabels: boolean, unfilteredHist: ICategoricalStatistics | null) {
  const mapping = col.getColorMapping();
  const bins = col.categories.map((c) => `<div class="${cssClass('histogram-bin')}" title="${c.label}: 0" data-cat="${c.name}" ${showLabels ? `data-title="${c.label}"` : ''}><div style="height: 0; background-color: ${mapping.apply(c)}"></div></div>`).join('');
  const template = `<div class="${cssClass('histogram')} ${col.dataLength! > DENSE_HISTOGRAM ? cssClass('dense'): ''}">${bins}`; // no closing div to be able to append things


  return {
    template,
    update: (n: HTMLElement, lMaxBin: number, hist: ICategoricalBin[]) => {
      const mapping = col.getColorMapping();

      const selected = col.categories.map((d) => {
        const c = color(mapping.apply(d))!;
        c.opacity = FILTERED_OPACITY;
        return c.toString();
      });

      const gHist = unfilteredHist ? unfilteredHist.hist! : null;
      const maxBin = unfilteredHist ? unfilteredHist.maxBin : lMaxBin;
      forEach(n, '[data-cat]', (d: HTMLElement, i) => {
        const cat = col.categories[i];
        const {y} = hist[i];
        const inner = <HTMLElement>d.firstElementChild!;
        if (gHist) {
          const {y: gY} = gHist[i];
          d.title = `${cat.label}: ${y} of ${gY}`;
          inner.style.height = `${round(gY * 100 / maxBin, 2)}%`;
          const relY = 100 - round(y * 100 / gY, 2);
          inner.style.background = relY === 0 ? mapping.apply(cat) : (relY === 100 ? selected[i] : `linear-gradient(${selected[i]} ${relY}%, ${mapping.apply(cat)} ${relY}%, ${mapping.apply(cat)} 100%)`);
        } else {
          d.title = `${col.categories[i].label}: ${y}`;
          const inner = <HTMLElement>d.firstElementChild!;
          inner.style.height = `${Math.round(y * 100 / maxBin)}%`;
          inner.style.background = mapping.apply(cat);
        }
      });
    }
  };
}

/** @internal */
export function interactiveHist(col: CategoricalColumn | OrdinalColumn, node: HTMLElement) {
  const bins = <HTMLElement[]>Array.from(node.querySelectorAll('[data-cat]'));

  bins.forEach((bin, i) => {
    const cat = col.categories[i];

    bin.onclick = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();

      // toggle filter
      const old = col.getFilter();
      if (old == null || !Array.isArray(old.filter)) {
        // deselect
        const included = col.categories.slice();
        bin.dataset.filtered = '';
        included.splice(i, 1);
        col.setFilter({
          filterMissing: old ? old.filterMissing : false,
          filter: included.map((d) => d.name)
        });
        return;
      }
      const filter = old.filter.slice();
      const contained = filter.indexOf(cat.name);
      if (contained >= 0) {
        // remove
        bin.dataset.filtered = '';
        filter.splice(contained, 1);
      } else {
        // readd
        delete bin.dataset.filtered;
        filter.push(cat.name);
      }
      if (!old.filterMissing && filter.length === col.categories.length) {
        // dummy filter
        col.setFilter(null);
        return;
      }
      col.setFilter({
        filterMissing: old.filterMissing,
        filter
      });
    };
  });


  const filterMissing = <HTMLInputElement>node.querySelector('input')!;

  if (filterMissing) {
    filterMissing.onchange = () => {
      // toggle filter
      const v = filterMissing.checked;
      const old = col.getFilter();
      if (old == null) {
        col.setFilter(v ? {filterMissing: v, filter: col.categories.map((d) => d.name)} : null);
      } else if (!v && Array.isArray(old.filter) && old.filter.length === col.categories.length) {
        // dummy
        col.setFilter(null);
      } else {
        col.setFilter({filterMissing: v, filter: old.filter});
      }
    };
  }


  return (missing: number, actCol: CategoricalColumn | OrdinalColumn) => {
    col = actCol;
    const cats = col.categories;
    const f = col.getFilter();
    bins.forEach((bin, i) => {
      if (!isCategoryIncluded(f, cats[i])) {
        bin.dataset.filtered = '';
      } else {
        delete bin.dataset.filtered;
      }
    });
    if (filterMissing) {
      filterMissing.checked = f != null && f.filterMissing;
      updateFilterMissingNumberMarkup(<HTMLElement>filterMissing.parentElement, missing);
    }
  };
}
