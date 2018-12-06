import {DENSE_HISTOGRAM} from '../config';
import {ICategoricalStatistics, round} from '../internal/math';
import {ICategoricalColumn, IDataRow, IOrderedGroup, SetColumn} from '../model';
import CategoricalColumn from '../model/CategoricalColumn';
import Column from '../model/Column';
import {isCategoryIncluded, ISetColumn, isSetColumn, isCategoricalColumn} from '../model/ICategoricalColumn';
import OrdinalColumn from '../model/OrdinalColumn';
import {CANVAS_HEIGHT, cssClass, FILTERED_OPACITY} from '../styles';
import {filterMissingNumberMarkup, updateFilterMissingNumberMarkup} from '../ui/missing';
import {default as IRenderContext, ICellRendererFactory, ERenderMode} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {setText, wideEnough, forEach} from './utils';
import {color} from 'd3-color';

/** @internal */
export declare type HasCategoricalFilter = CategoricalColumn | OrdinalColumn | SetColumn;

/** @internal */
export default class CategoricalCellRenderer implements ICellRendererFactory {
  readonly title = 'Color';
  readonly groupTitle = 'Histogram';

  canRender(col: Column, mode: ERenderMode) {
    return isSetColumn(col) && (mode !== ERenderMode.CELL || isCategoricalColumn(col));
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

  createGroup(col: ISetColumn, context: IRenderContext) {
    const {template, update} = hist(col, false);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupCategoricalStats(col, group, (hist) => {
          update(n, hist);
        });
      }
    };
  }

  createSummary(col: ISetColumn, context: IRenderContext, interactive: boolean) {
    return (col instanceof CategoricalColumn || col instanceof OrdinalColumn || col instanceof SetColumn) ? interactiveSummary(col, context, interactive) : staticSummary(col, context, interactive);
  }
}

function staticSummary(col: ISetColumn, context: IRenderContext, interactive: boolean) {
  const {template, update} = hist(col, interactive);
  return {
    template: `${template}</div>`,
    update: (n: HTMLElement) => {
      return context.tasks.rankingCategoricalStats(col, (hist) => {
        n.classList.toggle(cssClass('missing'), !hist);
        if (!hist) {
          return;
        }
        update(n, hist, hist);
      });
    }
  };
}

function interactiveSummary(col: HasCategoricalFilter, context: IRenderContext, interactive: boolean) {
  const {template, update} = hist(col, interactive || wideEnough(col));
  let filterUpdate: (missing: number, col: HasCategoricalFilter) => void;
  return {
    template: `${template}${interactive ? filterMissingNumberMarkup(false, 0, context.idPrefix) : ''}</div>`,
    update: (n: HTMLElement) => {
      if (!filterUpdate) {
        filterUpdate = interactiveHist(col, n);
      }
      return context.tasks.rankingCategoricalStats(col, (hist, gHist) => {
        filterUpdate((interactive && gHist) ? gHist.missing : (hist ? hist.missing : 0), col);

        n.classList.toggle(cssClass('missing'), !hist);
        if (!hist) {
          return;
        }
        update(n, hist, gHist);
      });
    }
  };
}

function hist(col: ISetColumn, showLabels: boolean) {
  const mapping = col.getColorMapping();
  const bins = col.categories.map((c) => `<div class="${cssClass('histogram-bin')}" title="${c.label}: 0" data-cat="${c.name}" ${showLabels ? `data-title="${c.label}"` : ''}><div style="height: 0; background-color: ${mapping.apply(c)}"></div></div>`).join('');
  const template = `<div class="${cssClass('histogram')} ${col.dataLength! > DENSE_HISTOGRAM ? cssClass('dense') : ''}">${bins}`; // no closing div to be able to append things


  return {
    template,
    update: (n: HTMLElement, hist: ICategoricalStatistics, gHist?: ICategoricalStatistics) => {
      const mapping = col.getColorMapping();

      const selected = col.categories.map((d) => {
        const c = color(mapping.apply(d))!;
        c.opacity = FILTERED_OPACITY;
        return c.toString();
      });

      const maxBin = gHist ? gHist.maxBin : hist.maxBin;
      forEach(n, '[data-cat]', (d: HTMLElement, i) => {
        const cat = col.categories[i];
        const {count} = hist.hist[i];
        const inner = <HTMLElement>d.firstElementChild!;
        if (gHist) {
          const {count: gCount} = gHist.hist[i];
          d.title = `${cat.label}: ${count} of ${gCount}`;
          inner.style.height = `${round(gCount * 100 / maxBin, 2)}%`;
          const relY = 100 - round(count * 100 / gCount, 2);
          inner.style.background = relY === 0 ? mapping.apply(cat) : (relY === 100 ? selected[i] : `linear-gradient(${selected[i]} ${relY}%, ${mapping.apply(cat)} ${relY}%, ${mapping.apply(cat)} 100%)`);
        } else {
          d.title = `${col.categories[i].label}: ${count}`;
          const inner = <HTMLElement>d.firstElementChild!;
          inner.style.height = `${Math.round(count * 100 / maxBin)}%`;
          inner.style.background = mapping.apply(cat);
        }
      });
    }
  };
}

/** @internal */
export function interactiveHist(col: HasCategoricalFilter, node: HTMLElement) {
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


  return (missing: number, actCol: HasCategoricalFilter) => {
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
