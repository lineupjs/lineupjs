import AggregateGroupColumn from '../model/AggregateGroupColumn';
import {ISVGCellRenderer, IHTMLCellRenderer, ISVGGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {clipText, attr} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';
import {IGroup} from '../model/Group';
import Column from '../model/Column';

function render(ctx: CanvasRenderingContext2D, icon: string, col: AggregateGroupColumn, context: ICanvasRenderContext) {
  const width = col.getVisibleWidth();
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
  createSVG(col: AggregateGroupColumn, context: IDOMRenderContext): ISVGCellRenderer {
    return {
      template: `<text class='aggregate fa text_center'><title>Collapse Group</title>\uf0d7</text>`, //fa-caret-down
      update(node: SVGTextElement, row: IDataRow, i: number, group: IGroup) {
        attr(node, {
          x: col.getVisibleWidth() / 2
        }, {
          display: i === 0 ? null : 'none'
        });
        node.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          col.setAggregated(group, true);
        };
      }
    };
  }

  createGroupSVG(col: AggregateGroupColumn, context: IDOMRenderContext): ISVGGroupRenderer {
    return {
      template: `<text class='aggregate fa text_center'><title>Expand Group</title>\uf0da</text>`, //fa-caret-right
      update(node: SVGTextElement, group: IGroup, rows: IDataRow[]) {
        const width = col.getCompressed() ? Column.COMPRESSED_WIDTH : col.getWidth();
        attr(node, {
          x: col.getVisibleWidth() / 2
        });
        node.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          col.setAggregated(group, false);
        };
      }
    };
  }


  createCanvas(col: AggregateGroupColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (i === 0) { //just for the first in each group
        render(ctx, '\uf0d7', col, context);
      }
    };
  }

  createGroupCanvas(col: AggregateGroupColumn, context: ICanvasRenderContext): ICanvasGroupRenderer {
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      render(ctx, '\uf0da', col, context);
    };
  }
}
