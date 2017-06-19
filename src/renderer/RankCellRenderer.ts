

import {DefaultCellRenderer} from './DefaultCellRenderer';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IDataRow} from '../provider/ADataProvider';
import {IGroup} from '../model/Group';
import RankColumn from '../model/RankColumn';
import {clipText, attr} from '../utils';
import {ISVGGroupRenderer} from './IDOMCellRenderers';

export default class RankCellRenderer extends DefaultCellRenderer {
  constructor() {
    super('rank', 'right');
  }

  createGroupSVG(col: RankColumn, context: IDOMRenderContext): ISVGGroupRenderer {
    return {
      template: `<text class="rank" clip-path="url(#cp${context.idPrefix}clipCol${col.id})"><tspan></tspan><tspan></tspan></text>`,
      update: (n: SVGTextElement, group: IGroup, rows: IDataRow[]) => {
        const alignmentShift = col.getWidth() - 5;
        const fromTSpan = <SVGTSpanElement>n.firstElementChild;
        const toTSpan = <SVGTSpanElement>n.lastElementChild;
        if (rows.length === 0) {
          fromTSpan.textContent = '';
          toTSpan.textContent = '';
          return;
        }
        attr(fromTSpan, {
          x: alignmentShift
        }).textContent = col.getLabel(rows[0].v, rows[0].dataIndex);
        //TODO relative offset -12 hard coded
        attr(toTSpan, {
          x: alignmentShift,
          dy: context.groupHeight(group) - 12
        }).textContent = col.getLabel(rows[rows.length - 1].v, rows[rows.length - 1].dataIndex);
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
