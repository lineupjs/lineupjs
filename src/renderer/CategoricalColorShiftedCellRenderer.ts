import ICellRendererFactory from './ICellRendererFactory';
import {ICategoricalColumn} from '../model/CategoricalColumn';
import Column from '../model/Column';
import {ICanvasRenderContext} from './RendererContexts';
import {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IGroup} from '../model/Group';
import {clipText} from '../utils';
import Ranking from '../model/Ranking';
import CategoricalColorCellRenderer from './CategoricalColorCellRenderer';

/**
 * renders categorical columns as a colored rect with label
 */
export default class CategoricalColorShiftedCellRenderer implements ICellRendererFactory {
  static total(ranking: Ranking, group:  IGroup) {
    let before = 0;
    let total = 0;
    let after = false;
    ranking.getGroups().forEach((g) => {
      if (g === group) {
        after = true;
      }
      total += g.order.length;
      if (!after) {
        before += g.order.length;
      }
    });
    return {before, total};
  }

  createGroupDOM(col: ICategoricalColumn & Column): IDOMGroupRenderer {
    return {
      template: `<div></div>`,
      update: (n: HTMLElement, group: IGroup, rows: IDataRow[]) => {
        const {count, label, color} = CategoricalColorCellRenderer.choose(col, rows);
         const {total, before} = CategoricalColorShiftedCellRenderer.total(col.findMyRanker()!, group);
        n.innerHTML = `<div style="background-color: ${color}; width: ${total === 0 ? 100 : Math.round(100 * count / total)}%; left: ${total === 0 ? 0 : Math.round(100 * before / total)}%"></div><span>${label} (${count})</span>`;
      }
    };
  }

  createGroupCanvas(col: ICategoricalColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const width = context.colWidth(col);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      const height = context.groupHeight(group);
      const {count, label, color} = CategoricalColorCellRenderer.choose(col, rows);
      ctx.fillStyle = color;
      const {total, before} = CategoricalColorShiftedCellRenderer.total(col.findMyRanker()!, group);
      if (total === 0) {
        return;
      }
      ctx.fillRect(total === 0 ? 0 : (width * before / total), 0, total === 0 ? width : (width * count / total), height);

      ctx.fillStyle = context.option('style.text', 'black');

      const bak = ctx.textAlign;
      ctx.textAlign = 'center';
      clipText(ctx, `${label} (${count})`, width / 2, height / 2, width, context.textHints);
      ctx.textAlign = bak;
    };
  }
}
