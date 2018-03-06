import {DENSE_HISTOGRAM} from '../config';
import {computeHist, ICategoricalBin, ICategoricalStatistics} from '../internal/math';
import {ICategoricalColumn, IDataRow, IGroup, isCategoricalColumn} from '../model';
import CategoricalColumn from '../model/CategoricalColumn';
import Column from '../model/Column';
import {isCategoryIncluded} from '../model/ICategoricalColumn';
import OrdinalColumn from '../model/OrdinalColumn';
import {CANVAS_HEIGHT} from '../styles';
import {filterMissingNumberMarkup, updateFilterMissingNumberMarkup} from '../ui/missing';
import {default as IRenderContext, ICellRendererFactory} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {setText, wideEnough, forEach} from './utils';

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
        <div></div><div></div>
      </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        const v = col.getCategory(d);
        (<HTMLDivElement>n.firstElementChild!).style.backgroundColor = v ? v.color : null;
        setText(<HTMLSpanElement>n.lastElementChild!, col.getLabel(d));
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        const v = col.getCategory(d);
        ctx.fillStyle = v ? v.color : '';
        ctx.fillRect(0, 0, width, CANVAS_HEIGHT);
      }
    };
  }

  createGroup(col: ICategoricalColumn, _context: IRenderContext, globalHist: ICategoricalStatistics | null) {
    const {template, update} = hist(col, false);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const {maxBin, hist} = computeHist(rows, (r: IDataRow) => col.getCategory(r), col.categories);

        const max = Math.max(maxBin, globalHist ? globalHist.maxBin : 0);
        update(n, max, hist);
      }
    };
  }

  createSummary(col: ICategoricalColumn, ctx: IRenderContext, interactive: boolean) {
    return (col instanceof CategoricalColumn || col instanceof OrdinalColumn) ? interactiveSummary(col, interactive, ctx.idPrefix) : staticSummary(col, interactive);
  }
}

function staticSummary(col: ICategoricalColumn, interactive: boolean) {
  const {template, update} = hist(col, interactive);
  return {
    template: `${template}</div>`,
    update: (n: HTMLElement, hist: ICategoricalStatistics | null) => {
      n.classList.toggle('lu-missing', !hist);
      if (!hist) {
        return;
      }
      update(n, hist.maxBin, hist.hist);
    }
  };
}

function interactiveSummary(col: CategoricalColumn | OrdinalColumn, interactive: boolean, idPrefix: string) {
  const {template, update} = hist(col, interactive || wideEnough(col));
  let filterUpdate: (missing: number, col: CategoricalColumn | OrdinalColumn) => void;
  return {
    template: `${template}${interactive ? filterMissingNumberMarkup(false, 0, idPrefix) : ''}</div>`,
    update: (n: HTMLElement, hist: ICategoricalStatistics | null) => {
      if (!filterUpdate) {
        filterUpdate = interactiveHist(col, n);
      }
      filterUpdate(hist ? hist.missing : 0, col);

      n.classList.toggle('lu-missing', !hist);
      if (!hist) {
        return;
      }
      update(n, hist.maxBin, hist.hist);
    }
  };
}

function hist(col: ICategoricalColumn, showLabels: boolean) {
  const bins = col.categories.map((c) => `<div title="${c.label}: 0" data-cat="${c.name}" ${showLabels ? `data-title="${c.label}"` : ''}><div style="height: 0; background-color: ${c.color}"></div></div>`).join('');

  return {
    template: `<div${col.dataLength! > DENSE_HISTOGRAM ? 'class="lu-dense"' : ''}>${bins}`, // no closing div to be able to append things
    update: (n: HTMLElement, maxBin: number, hist: ICategoricalBin[]) => {
      forEach(n, '[data-cat]', (d: HTMLElement, i) => {
        const {y} = hist[i];
        d.title = `${col.categories[i].label}: ${y}`;
        const inner = <HTMLElement>d.firstElementChild!;
        inner.style.height = `${Math.round(y * 100 / maxBin)}%`;
      });
    }
  };
}

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
        const without = col.categories.slice();
        bin.dataset.filtered = 'filtered';
        without.splice(i, 1);
        col.setFilter({
          filterMissing: old ? old.filterMissing : false,
          filter: without.map((d) => d.name)
        });
        return;
      }
      const filter = old.filter.slice();
      const contained = filter.indexOf(cat.name);
      if (contained >= 0) {
        // remove
        bin.dataset.filtered = 'filtered';
        filter.splice(contained, 1);
      } else {
        // readd
        delete bin.dataset.filtered;
        filter.push(cat.name);
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
        bin.dataset.filtered = 'filtered';
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
