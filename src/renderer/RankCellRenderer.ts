

import {DefaultCellRenderer} from './DefaultCellRenderer';
import {ICanvasRenderContext} from './RendererContexts';
import {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IDataRow} from '../provider/ADataProvider';
import {IGroup} from '../model/Group';
import RankColumn from '../model/RankColumn';
import {clipText} from '../utils';

export default class RankCellRenderer extends DefaultCellRenderer {
  constructor() {
    super('rank', 'right');
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
