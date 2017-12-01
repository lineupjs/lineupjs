import ICellRendererFactory from './ICellRendererFactory';
import {ICategoricalColumn} from '../model/ICategoricalColumn';
import Column from '../model/Column';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IGroup} from '../model/Group';
import {clipText} from '../utils';
import {renderMissingCanvas, renderMissingDOM} from './missing';

/**
 * renders categorical columns as a colored rect with label
 */
export default class CategoricalColorCellRenderer implements ICellRendererFactory {
  readonly title = 'Color';

  canRender() {
    return false; // only direct selection
  }

  createDOM(col: ICategoricalColumn & Column): IDOMCellRenderer {
    return {
      template: `<div style="background-color: transparent" title=""></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        n.style.backgroundColor = missing ? null : col.getColor(d.v, d.dataIndex);
        n.title = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: ICategoricalColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }
      ctx.fillStyle = col.getColor(d.v, d.dataIndex) || '';
      ctx.fillRect(0, 0, context.colWidth(col), context.rowHeight(i));
    };
  }

  static choose(col: ICategoricalColumn & Column, rows: IDataRow[]) {
    const hist = new Map<string, number>();
    col.categories.forEach((cat) => hist.set(cat, 0));
    rows.forEach((row) =>
      col.getCategories(row.v, row.dataIndex).forEach((cat) =>
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

  createGroupDOM(col: ICategoricalColumn & Column): IDOMGroupRenderer {
    return {
      template: `<div style="background-color: white"></div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const {count, label, color} = CategoricalColorCellRenderer.choose(col, rows);
        n.textContent = `${label} (${count})`;
        n.style.backgroundColor = color;
      }
    };
  }

  createGroupCanvas(col: ICategoricalColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const width = context.colWidth(col);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      const height = context.groupHeight(group);
      const {count, label, color} = CategoricalColorCellRenderer.choose(col, rows);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = context.option('style.text', 'black');

      const bak = ctx.textAlign;
      ctx.textAlign = 'center';
      clipText(ctx, `${label} (${count})`, width / 2, height / 2, width, context.textHints);
      ctx.textAlign = bak;
    };
  }
}
