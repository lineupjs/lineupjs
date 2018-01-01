import {IDataRow, IGroup} from '../model';
import AggregateGroupColumn from '../model/AggregateGroupColumn';
import Column from '../model/Column';
import {AGGREGATE, CANVAS_HEIGHT} from '../styles';
import {ICellRendererFactory, default as IRenderContext} from './interfaces';

export default class AggregateGroupRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof AggregateGroupColumn;
  }

  create(col: AggregateGroupColumn, context: IRenderContext) {
    const width = context.colWidth(col);
    return {
      template: `<div title="Collapse Group"></div>`,
      update(node: HTMLElement, _row: IDataRow, _i: number, group: IGroup) {
        node.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          col.setAggregated(group, true);
        };
      },
      render: (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = AGGREGATE.color;
        ctx.fillRect(width - AGGREGATE.width, 0, AGGREGATE.strokeWidth, CANVAS_HEIGHT);
      }
    };
  }

  createGroup(col: AggregateGroupColumn) {
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
}
