import {ICategoricalColumn, IDataRow, IGroup} from '../model';
import Column from '../model/Column';
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

  create(col: ICategoricalColumn & Column, context: IRenderContext) {
    const width = context.colWidth(col);
    return {
      template: `<div style="background-color: transparent" title=""></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        n.style.backgroundColor = missing ? null : col.getColor(d);
        n.title = col.getLabel(d);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        ctx.fillStyle = col.getColor(d) || '';
        ctx.fillRect(0, 0, width, CANVAS_HEIGHT);
      }
    };
  }

  static choose(col: ICategoricalColumn & Column, rows: IDataRow[]) {
    const hist = new Map<string, number>();
    col.categories.forEach((cat) => hist.set(cat, 0));
    rows.forEach((row) =>
      col.getCategories(row).forEach((cat) =>
        hist.set(cat, (hist.get(cat) || 0) + 1)));

    let max = 0, maxCat = 0;
    col.categories.forEach((cat, i) => {
      const count = hist.get(cat)!;
      if (count > max) {
        max = count;
        maxCat = i;
      }
    });
    return {
      count: max,
      label: col.categoryLabels[maxCat],
      color: col.categoryColors[maxCat]
    };
  }

  createGroup(col: ICategoricalColumn & Column) {
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
