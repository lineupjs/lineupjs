import ICellRendererFactory from './ICellRendererFactory';
import CategoricalColumn from '../model/CategoricalColumn';
import Column from '../model/Column';
import {ICanvasRenderContext} from './RendererContexts';
import {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {clipText} from '../utils';
import {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IGroup} from '../model/Group';

/**
 * renders just the most frequent categorical group
 */
export default class MostCategoricalGroupRenderer implements ICellRendererFactory {
  private static choose(col: CategoricalColumn & Column, rows: IDataRow[]) {
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

  createGroupDOM(col: CategoricalColumn & Column): IDOMGroupRenderer {
    return {
      template: `<div style="background-color: white"></div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const {count, label, color} = MostCategoricalGroupRenderer.choose(col, rows);
        n.textContent = `${label} (${count})`;
        n.style.backgroundColor = color;
      }
    };
  }

  createGroupCanvas(col: CategoricalColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const width = context.colWidth(col);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      const height = context.groupHeight(group);
      const {count, label, color} = MostCategoricalGroupRenderer.choose(col, rows);
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
