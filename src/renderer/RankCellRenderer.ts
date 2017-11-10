import {DefaultCellRenderer} from './DefaultCellRenderer';
import {ICanvasRenderContext} from './RendererContexts';
import {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IDataRow} from '../provider/ADataProvider';
import {IGroup} from '../model/Group';
import RankColumn from '../model/RankColumn';
import {clipText} from '../utils';
import {IDOMGroupRenderer} from './IDOMCellRenderers';
import Column from '../model/Column';

export default class RankCellRenderer extends DefaultCellRenderer {
  readonly title = 'String';

  constructor() {
    super('rank', 'right');
  }

  canRender(col: Column) {
    return col instanceof RankColumn;
  }

  createGroupDOM(col: RankColumn): IDOMGroupRenderer {
    return {
      template: `<div><div></div><div></div></div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const fromTSpan = <HTMLElement>n.firstElementChild!;
        const toTSpan = <HTMLElement>n.lastElementChild!;
        if (rows.length === 0) {
          fromTSpan.textContent = '';
          toTSpan.textContent = '';
          return;
        }
        fromTSpan.textContent = col.getLabel(rows[0].v, rows[0].dataIndex);
        toTSpan.textContent = col.getLabel(rows[rows.length - 1].v, rows[rows.length - 1].dataIndex);
      }
    };
  }

  createGroupCanvas(col: RankColumn, context: ICanvasRenderContext): ICanvasGroupRenderer {
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      if (rows.length === 0) {
        return;
      }
      const fromRank = col.getLabel(rows[0].v, rows[0].dataIndex);
      const toRank = col.getLabel(rows[rows.length - 1].v, rows[rows.length - 1].dataIndex);
      const bak = ctx.textAlign;
      ctx.textAlign = 'right';
      const w = col.getWidth();
      const shift = w;
      clipText(ctx, fromRank, shift, 0, w, context.textHints);
      clipText(ctx, toRank, shift, context.groupHeight(group) - context.textHints.spinnerWidth, w, context.textHints);
      ctx.textAlign = bak;
    };
  }
}
