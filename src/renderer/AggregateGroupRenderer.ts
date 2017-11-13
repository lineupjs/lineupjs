import AggregateGroupColumn from '../model/AggregateGroupColumn';
import {IDOMCellRenderer, IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {ICanvasRenderContext} from './RendererContexts';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {clipText} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';
import {IGroup} from '../model/Group';
import Column from '../model/Column';

function render(ctx: CanvasRenderingContext2D, icon: string, col: AggregateGroupColumn, context: ICanvasRenderContext) {
  const width = context.colWidth(col);
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
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof AggregateGroupColumn;
  }

  createDOM(col: AggregateGroupColumn): IDOMCellRenderer {
    return {
      template: `<div title="Collapse Group"></div>`,
      update(node: HTMLElement, _row: IDataRow, _i: number, group: IGroup) {
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
