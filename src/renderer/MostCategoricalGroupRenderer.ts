import ICellRendererFactory from './ICellRendererFactory';
import CategoricalColumn from '../model/CategoricalColumn';
import Column from '../model/Column';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer, IHTMLCellRenderer, ISVGGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr, clipText} from '../utils';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IGroup} from '../model/Group';
import * as d3 from 'd3';

/**
 * renders just the most frequent categorical group
 */
export default class MostCategoricalGroupRenderer implements ICellRendererFactory {
  private static choose(col: CategoricalColumn & Column, rows: IDataRow[]) {
    const hist = new Map<string, number>();
    col.categories.forEach((cat) => hist.set(cat, 0));
    rows.forEach((row) =>
      col.getCategories(row.v, row.dataIndex).forEach((cat) =>
        hist.set(cat, hist.get(cat) + 1)));

    let max = 0, maxCat = 0;
    col.categories.forEach((cat, i) => {
      const count = hist.get(cat);
      if (count > max) {
        max = count;
        maxCat = i;
      }
    });
    return {
      count: max,
      name: col.categories[maxCat],
      label: col.categoryLabels[maxCat],
      color: col.categoryColors[maxCat]
    };
  }

  createGroupSVG(col: CategoricalColumn & Column, context: IDOMRenderContext): ISVGGroupRenderer {
    return {
      template: `<g class='most-category'><rect width="${col.getWidth()}" height="0"></rect><text x="${col.getWidth()/2}"></text></g>`,
      update: (n: SVGGElement, group: IGroup, rows: IDataRow[]) => {
        const height = context.groupHeight(group);
        const {count, name, label, color} = MostCategoricalGroupRenderer.choose(col, rows);
        attr(n.querySelector('rect'), {
          height
        }, {
          fill: color
        });
        attr(n.querySelector('text'), {
          y: height/2
        }).textContent = `${label} (${count})`;
      }
    };
  }

  createGroupCanvas(col: CategoricalColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      const height = context.groupHeight(group);
      const {count, name, label, color} = MostCategoricalGroupRenderer.choose(col, rows);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, col.getWidth(), height);
      ctx.fillStyle = context.option('style.text', 'black');

      const bak = ctx.textAlign;
      ctx.textAlign = 'center';
      clipText(ctx, `${label} (${count})`, col.getWidth()/2, height / 2, col.getWidth(), context.textHints);
      ctx.textAlign = bak;
    };
  }
}
