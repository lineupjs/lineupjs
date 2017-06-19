import AggregateGroupColumn from '../model/AggregateGroupColumn';
import {ISVGCellRenderer, IHTMLCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {ICanvasRenderContext} from './RendererContexts';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {clipText} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';
import {IGroup} from '../model/Group';
import Column from '../model/Column';

function render(ctx: CanvasRenderingContext2D, icon: string, col: AggregateGroupColumn, context: ICanvasRenderContext) {
  const width = col.getCompressed() ? Column.COMPRESSED_WIDTH : col.getWidth();
  const bak = ctx.font;
  const bakAlign = ctx.textAlign;
  ctx.textAlign = 'center';
  ctx.font = '10pt FontAwesome';
  //aggregate
  clipText(ctx, icon, width/2, 0, width, context.textHints);
  ctx.font = bak;
  ctx.textAlign = bakAlign;
}

export default class AggregateGroupRenderer implements ICellRendererFactory {
  createCanvas(col: AggregateGroupColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (i === 0) { //just for the first in each group
        render(ctx, '\uf142', col, context);
      }
    };
  }

  createGroupCanvas(col: AggregateGroupColumn, context: ICanvasRenderContext): ICanvasGroupRenderer {
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      render(ctx, '\uf142', col, context);
    };
  }
}
