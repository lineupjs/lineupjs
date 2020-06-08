import {DENSE_HISTOGRAM} from '../constants';
import {ICategoricalStatistics, round} from '../internal';
import {OrdinalColumn, isCategoricalColumn, isCategoricalLikeColumn, ICategoricalLikeColumn, ICategory, Column, CategoricalColumn, ICategoricalColumn, IDataRow, IOrderedGroup, SetColumn} from '../model';
import {CANVAS_HEIGHT, cssClass, FILTERED_OPACITY} from '../styles';
import {filterMissingNumberMarkup, updateFilterMissingNumberMarkup} from '../ui/missing';
import {IRenderContext, ICellRendererFactory, ERenderMode, ICellRenderer, IGroupCellRenderer, ISummaryRenderer} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {setText, wideEnough, forEach} from './utils';
import {color} from 'd3-color';

/** @internal */
export declare type HasCategoricalFilter = CategoricalColumn | OrdinalColumn | SetColumn;

/** @internal */
export default class CategoricalCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Color';
  readonly groupTitle: string = 'Histogram';

  canRender(col: Column, mode: ERenderMode): boolean {
    return isCategoricalLikeColumn(col) && (mode !== ERenderMode.CELL || isCategoricalColumn(col));
  }

  create(col: ICategoricalColumn, context: IRenderContext): ICellRenderer {
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

  createGroup(col: ICategoricalLikeColumn, context: IRenderContext): IGroupCellRenderer {
    const {template, update} = hist(col, false);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupCategoricalStats(col, group).then((r) => {
          if (typeof r === 'symbol') {
            return;
          }
          const isMissing = !r || r.group == null || r.group.count === 0 || r.group.count === r.group.missing;
          n.classList.toggle(cssClass('missing'), isMissing);
          if (isMissing) {
            return;
          }
          update(n, r.group);
        });
      }
    };
  }

  createSummary(col: ICategoricalLikeColumn, context: IRenderContext, interactive: boolean): ISummaryRenderer {
    return (col instanceof CategoricalColumn || col instanceof OrdinalColumn || col instanceof SetColumn) ? interactiveSummary(col, context, interactive) : staticSummary(col, context, interactive);
  }
}

function staticSummary(col: ICategoricalLikeColumn, context: IRenderContext, interactive: boolean) {
  const {template, update} = hist(col, interactive);
  return {
    template: `${template}</div>`,
    update: (n: HTMLElement) => {
      return context.tasks.summaryCategoricalStats(col).then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const isMissing = !r || r.summary == null || r.summary.count === 0 || r.summary.count === r.summary.missing;
        n.classList.toggle(cssClass('missing'), isMissing);
        if (isMissing) {
          return;
        }
        update(n, r.summary);
      });
    }
  };
}

function interactiveSummary(col: HasCategoricalFilter, context: IRenderContext, interactive: boolean) {
  const {template, update} = hist(col, interactive || wideEnough(col));
  let filterUpdate: (missing: number, col: HasCategoricalFilter) => void;
  return {
    template: `${template}${interactive ? filterMissingNumberMarkup(false, 0) : ''}</div>`,
    update: (n: HTMLElement) => {
      n.classList.toggle(cssClass('histogram-i'), interactive);

      if (!filterUpdate) {
        filterUpdate = interactiveHist(col, n);
      }
      return context.tasks.summaryCategoricalStats(col).then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const {summary, data} = r;
        filterUpdate((interactive && data) ? data.missing : (summary ? summary.missing : 0), col);

        const isMissing = !r || r.summary == null || r.summary.count === 0 || r.summary.count === r.summary.missing;
        n.classList.toggle(cssClass('missing'), isMissing);
        if (isMissing) {
          return;
        }
        update(n, summary, interactive ? data : undefined);
      });
    }
  };
}

function hist(col: ICategoricalLikeColumn, showLabels: boolean) {
  const mapping = col.getColorMapping();
  const bins = col.categories.map((c) => `<div class="${cssClass('histogram-bin')}" title="${c.label}: 0" data-cat="${c.name}" ${showLabels ? `data-title="${c.label}"` : ''}><div style="height: 0; background-color: ${mapping.apply(c)}"></div></div>`).join('');
  const template = `<div class="${cssClass('histogram')} ${col.categories.length! > DENSE_HISTOGRAM ? cssClass('dense') : ''}">${bins}`; // no closing div to be able to append things


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

function setCategoricalFilter(col: HasCategoricalFilter, filter: string | RegExp | string[], filterMissing: boolean) {
  if (col instanceof SetColumn) {
    const f = col.getFilter();
    const mode = f ? f.mode : undefined;
    col.setFilter({
      filter, filterMissing, mode
    });
  } else {
    col.setFilter({
      filter, filterMissing
    })
  }
}

/** @internal */
export function interactiveHist(col: HasCategoricalFilter, node: HTMLElement) {
  const bins = <HTMLElement[]>Array.from(node.querySelectorAll('[data-cat]'));

  const markFilter = (bin: HTMLElement, cat: ICategory, value: boolean) => {
    // update filter highlight eagerly for better user feedback
    const inner = <HTMLElement>bin.firstElementChild!;
    const base = col.getColorMapping().apply(cat);
    if (value) {
      inner.style.background = base;
      return;
    }
    const c = color(base)!;
    c.opacity = FILTERED_OPACITY;
    inner.style.background = c.toString();
  };

  bins.forEach((bin, i) => {
    const cat = col.categories[i];

    bin.onclick = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();

      // toggle filter
      const old = col.getFilter();
      if (old == null || !Array.isArray(old.filter)) {
        // deselect
        markFilter(bin, cat, false);
        const included = col.categories.slice();
        included.splice(i, 1);
        setCategoricalFilter(col, included.map((d) => d.name), old ? old.filterMissing : false);
        return;
      }
      const filter = old.filter.slice();
      const contained = filter.indexOf(cat.name);
      if (contained >= 0) {
        // remove
        filter.splice(contained, 1);
        markFilter(bin, cat, false);
      } else {
        // readd
        filter.push(cat.name);
        markFilter(bin, cat, true);
      }
      if (!old.filterMissing && filter.length === col.categories.length) {
        // dummy filter
        col.setFilter(null);
        return;
      }
      setCategoricalFilter(col, filter, old.filterMissing);
    };
  });


  const filterMissing = <HTMLInputElement>node.getElementsByTagName('input')[0]!;

  if (filterMissing) {
    filterMissing.onchange = () => {
      // toggle filter
      const v = filterMissing.checked;
      const old = col.getFilter();
      if (old == null) {
        if (v) {
          setCategoricalFilter(col, col.categories.map((d) => d.name), v);
        } else {
          col.setFilter(null);
        }
      } else if (!v && Array.isArray(old.filter) && old.filter.length === col.categories.length) {
        // dummy
        col.setFilter(null);
      } else {
        setCategoricalFilter(col, old.filter, v);
      }
    };
  }


  return (missing: number, actCol: HasCategoricalFilter) => {
    col = actCol;
    const f = col.getFilter();
    if (filterMissing) {
      filterMissing.checked = f != null && f.filterMissing;
      updateFilterMissingNumberMarkup(<HTMLElement>filterMissing.parentElement, missing);
    }
  };
}
