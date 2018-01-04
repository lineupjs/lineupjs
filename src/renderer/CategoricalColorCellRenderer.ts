import {ICategoricalColumn, ICategory, IDataRow, IGroup} from '../model';
import {CANVAS_HEIGHT} from '../styles';
import {default as IRenderContext, ICellRendererFactory} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';

/**
 * renders categorical columns as a colored rect with label
 */
export default class CategoricalColorCellRenderer implements ICellRendererFactory {
  readonly title = 'Color';

  canRender() {
    return false; // only direct selection
  }

  create(col: ICategoricalColumn, context: IRenderContext) {
    const width = context.colWidth(col);
    return {
      template: `<div style="background-color: transparent" title=""></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        const v = col.getCategory(d);
        n.style.backgroundColor = missing || !v ? null : v.color;
        n.title = col.getLabel(d);
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

  static choose(col: ICategoricalColumn, rows: IDataRow[]) {
    const hist = new Map<ICategory, number>();
    const cats = col.categories;
    cats.forEach((cat) => hist.set(cat, 0));
    rows.forEach((row) => {
      const v = col.getCategory(row);
      if (v) {
        hist.set(v, (hist.get(v) || 0) + 1);
      }
    });

    let max = 0, maxCat = 0;
    cats.forEach((cat, i) => {
      const count = hist.get(cat)!;
      if (count > max) {
        max = count;
        maxCat = i;
      }
    });
    const maxCategory = cats[maxCat];
    return {
      count: max,
      label: maxCategory.label,
      color: maxCategory.color
    };
  }

  createGroup(col: ICategoricalColumn) {
    return {
      template: `<div style="background-color: white"></div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const {count, label, color} = CategoricalColorCellRenderer.choose(col, rows);
        n.textContent = `${label} (${count})`;
        n.style.backgroundColor = color;
      }
    };
  }
}
