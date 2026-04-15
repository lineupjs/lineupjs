import {
  OrdinalColumn,
  isCategoricalColumn,
  isCategoricalLikeColumn,
  type ICategoricalLikeColumn,
  type ICategory,
  Column,
  CategoricalColumn,
  type ICategoricalColumn,
  type IDataRow,
  type IOrderedGroup,
  SetColumn,
  BooleanColumn,
  CategoricalsColumn,
} from '../model';
import { CANVAS_HEIGHT, cssClass, FILTERED_OPACITY } from '../styles';
import { filterMissingNumberMarkup, updateFilterMissingNumberMarkup } from '../ui/missing';
import {
  type IRenderContext,
  type ICellRendererFactory,
  ERenderMode,
  type ICellRenderer,
  type IGroupCellRenderer,
  type ISummaryRenderer,
} from './interfaces';
import { renderMissingCanvas, renderMissingDOM } from './missing';
import { setText, wideEnough } from './utils';
import { color } from 'd3-color';
import { categoricalHistogram } from './categoricalHistogram';

/** @internal */
export declare type HasCategoricalFilter =
  | CategoricalColumn
  | OrdinalColumn
  | SetColumn
  | BooleanColumn
  | CategoricalsColumn;

export default class CategoricalCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Color & Label';
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
        (n.firstElementChild! as HTMLDivElement).style.backgroundColor = v ? col.getColor(d) : null;
        setText(n.lastElementChild! as HTMLSpanElement, col.getLabel(d));
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        const v = col.getCategory(d);
        ctx.fillStyle = v ? col.getColor(d) : '';
        ctx.fillRect(0, 0, width, CANVAS_HEIGHT);
      },
    };
  }

  createGroup(col: ICategoricalLikeColumn, context: IRenderContext): IGroupCellRenderer {
    const { template, update, matchBins } = categoricalHistogram(col, false, context.sanitize);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        matchBins(n);
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
      },
    };
  }

  createSummary(col: ICategoricalLikeColumn, context: IRenderContext, interactive: boolean): ISummaryRenderer {
    return col instanceof CategoricalColumn ||
      col instanceof OrdinalColumn ||
      col instanceof SetColumn ||
      col instanceof BooleanColumn ||
      col instanceof CategoricalsColumn
      ? interactiveSummary(col, context, interactive)
      : staticSummary(col, context, interactive);
  }
}

function staticSummary(col: ICategoricalLikeColumn, context: IRenderContext, interactive: boolean) {
  const { template, update } = categoricalHistogram(col, interactive, context.sanitize);
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
    },
  };
}

function interactiveSummary(col: HasCategoricalFilter, context: IRenderContext, interactive: boolean) {
  const { template, update, matchBins } = categoricalHistogram(col, interactive || wideEnough(col), context.sanitize);
  let filterUpdate: (missing: number, col: HasCategoricalFilter) => void;
  return {
    template: `${template}${interactive ? filterMissingNumberMarkup(false, 0) : ''}</div>`,
    update: (n: HTMLElement) => {
      n.classList.toggle(cssClass('histogram-i'), interactive);

      const matchedBins = matchBins(n);
      if (!filterUpdate || matchedBins) {
        filterUpdate = interactiveHist(col, n);
      }
      return context.tasks.summaryCategoricalStats(col).then((r) => {
        if (typeof r === 'symbol') {
          return;
        }
        const { summary, data } = r;
        filterUpdate(interactive && data ? data.missing : summary ? summary.missing : 0, col);

        const isMissing = !r || r.summary == null || r.summary.count === 0 || r.summary.count === r.summary.missing;
        n.classList.toggle(cssClass('missing'), isMissing);
        if (isMissing) {
          return;
        }
        update(n, summary, interactive ? data : undefined);
      });
    },
  };
}

function setCategoricalFilter(col: HasCategoricalFilter, filter: string | RegExp | string[], filterMissing: boolean) {
  if (col instanceof SetColumn) {
    const f = col.getFilter();
    const mode = f ? f.mode : undefined;
    col.setFilter({
      filter,
      filterMissing,
      mode,
    });
  } else {
    col.setFilter({
      filter,
      filterMissing,
    });
  }
}

/** @internal */
export function interactiveHist(col: HasCategoricalFilter, node: HTMLElement) {
  const bins = Array.from(node.querySelectorAll<HTMLElement>('[data-cat]'));

  const markFilter = (bin: HTMLElement, cat: ICategory, value: boolean) => {
    // update filter highlight eagerly for better user feedback
    const inner = bin.firstElementChild! as HTMLElement;
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
        setCategoricalFilter(
          col,
          included.map((d) => d.name),
          old ? old.filterMissing : false
        );
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

  const filterMissing = node.getElementsByTagName('input')[0]!;

  if (filterMissing) {
    filterMissing.onchange = () => {
      // toggle filter
      const v = filterMissing.checked;
      const old = col.getFilter();
      if (old == null) {
        if (v) {
          setCategoricalFilter(
            col,
            col.categories.map((d) => d.name),
            v
          );
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
      updateFilterMissingNumberMarkup(filterMissing.parentElement, missing);
    }
  };
}
