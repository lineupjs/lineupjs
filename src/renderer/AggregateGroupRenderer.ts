import AggregateGroupColumn from '../model/AggregateGroupColumn';
import {IDOMCellRenderer, IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {ICanvasRenderContext} from './RendererContexts';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {clipText} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';
import {IGroup} from '../model/Group';

function render(ctx: CanvasRenderingContext2D, icon: string, col: AggregateGroupColumn, context: ICanvasRenderContext) {
  const width = col.getActualWidth();
  const bak = ctx.font;
  const bakAlign = ctx.textAlign;
  ctx.textAlign = 'center';
  ctx.font = '10pt FontAwesome';
  //aggregate
  clipText(ctx, icon, width / 2, 0, width, context.textHints);
  ctx.font = bak;
  ctx.textAlign = bakAlign;
}

export default class AggregateGroupRenderer implements ICellRendererFactory {
  createDOM(col: AggregateGroupColumn): IDOMCellRenderer {
    return {
      template: `<div title="Collase Group"></div>`,
      update(node: HTMLElement, _row: IDataRow, i: number, group: IGroup) {
        node.style.visibility = i === 0 ? null : 'hidden';
        node.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          col.setAggregated(group, true);
        };
      }
    };
  }

  createGroupDOM(col: AggregateGroupColumn): IDOMGroupRenderer {
    return {
      template: `<div title="Expand Group"></div>`,
      update(node: HTMLElement, group: IGroup) {
        node.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          col.setAggregated(group, false);
        };
      }
    };
  }

  createCanvas(col: AggregateGroupColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, _d: IDataRow, i: number) => {
      if (i === 0) { //just for the first in each group
        render(ctx, '\uf0d7', col, context); //fa-caret-down
      }
    };
  }

  createGroupCanvas(col: AggregateGroupColumn, context: ICanvasRenderContext): ICanvasGroupRenderer {
    return (ctx: CanvasRenderingContext2D) => {
      render(ctx, '\uf0da', col, context);  //fa-caret-right
    };
  }
}
