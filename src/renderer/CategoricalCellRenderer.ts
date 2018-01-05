import {DENSE_HISTOGRAM} from '../config';
import {computeHist, ICategoricalStatistics} from '../internal/math';
import {ICategoricalColumn, IDataRow, IGroup, isCategoricalColumn} from '../model';
import CategoricalColumn from '../model/CategoricalColumn';
import Column from '../model/Column';
import {isIncluded} from '../model/ICategoricalColumn';
import OrdinalColumn from '../model/OrdinalColumn';
import {CANVAS_HEIGHT} from '../styles';
import {default as IRenderContext, ICellRendererFactory} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {forEachChild, setText} from './utils';

/**
 * renders categorical columns as a colored rect with label
 */
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

  private static hist(col: ICategoricalColumn, showLabels: boolean) {
    const bins = col.categories.map((c) => `<div title="${c.label}: 0" data-cat="${c.name}" ${showLabels ? `data-title="${c.label}"` : ''}><div style="height: 0; background-color: ${c.color}"></div></div>`).join('');

    return {
      template: `<div${col.dataLength! > DENSE_HISTOGRAM ? 'class="lu-dense"': ''}>${bins}</div>`,
      update: (n: HTMLElement, maxBin: number, hist: { cat: string; y: number }[]) => {
        forEachChild(n, (d: HTMLElement, i) => {
          const {y} = hist[i];
          d.title = `${col.categories[i].label}: ${y}`;
          const inner = <HTMLElement>d.firstElementChild!;
          inner.style.height = `${Math.round(y * 100 / maxBin)}%`;
        });
      }
    };
  }

  createGroup(col: ICategoricalColumn, _context: IRenderContext, globalHist: ICategoricalStatistics | null) {
    const {template, update} = CategoricalCellRenderer.hist(col, false);
    return {
      template,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const {maxBin, hist} = computeHist(rows, (r: IDataRow) => col.isMissing(r) ? '' : col.getCategory(r)!.name, col.categories.map((d) => d.name));

        const max = Math.max(maxBin, globalHist ? globalHist.maxBin : 0);
        update(n, max, hist);
      }
    };
  }

  private static interactiveHist(col: CategoricalColumn | OrdinalColumn, node: HTMLElement) {
    const bins = <HTMLElement[]>Array.from(node.querySelectorAll('[data-cat]'));
    const cats = col.categories;

    bins.forEach((bin, i) => {
      const cat = cats[i];

      bin.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        // toggle filter
        const old = col.getFilter();
        if (old == null || !Array.isArray(old.filter)) {
          // deselect
          const without = cats.slice();
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

    return () => {
      const f = col.getFilter();
      bins.forEach((bin, i) => {
        if (!isIncluded(f, cats[i])) {
          bin.dataset.filtered = 'filtered';
        } else {
          delete bin.dataset.filtered;
        }
      });
    };
  }

  createSummary(col: ICategoricalColumn, _context: IRenderContext, interactive: boolean) {
    const {template, update} = CategoricalCellRenderer.hist(col, interactive);
    let filterUpdate: ()=>void;
    return {
      template,
      update: (n: HTMLElement, hist: ICategoricalStatistics | null) => {

        if (col instanceof CategoricalColumn || col instanceof OrdinalColumn) {
          if (!filterUpdate) {
            filterUpdate = CategoricalCellRenderer.interactiveHist(col, n);
          }
          filterUpdate();
        }

        n.style.display = hist ? null : 'none';
        if (!hist) {
          return;
        }
        update(n, hist.maxBin, hist.hist);
      }
    };
  }
}
