import {IDataRow, IGroup} from '../model';
import AggregateGroupColumn from '../model/AggregateGroupColumn';
import Column from '../model/Column';
import {AGGREGATE, CANVAS_HEIGHT} from '../styles';
import {default as IRenderContext, ICellRendererFactory} from './interfaces';

/** @internal */
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
        // weird shift of 1
        ctx.fillRect(width - AGGREGATE.width - 1, 0, AGGREGATE.strokeWidth, CANVAS_HEIGHT);
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

  createSummary(col: AggregateGroupColumn, context: IRenderContext) {
    return {
      template: `<div title="(Un)Aggregate All" data-icon="caret-down"></div>`,
      update: (node: HTMLElement) => {
        const ranking = col.findMyRanker();
        const right = Boolean(ranking && ranking.getGroups().every((g) => col.isAggregated(g)));

        node.dataset.icon = right ? 'caret-right' : 'caret-down';

        node.onclick = (evt) => {
          evt.stopPropagation();
          const ranking = col.findMyRanker();
          if (!ranking || !context) {
            return;
          }
          const aggregate = node.dataset.icon === 'caret-down';
          node.dataset.icon = aggregate ? 'caret-right' : 'caret-down';
          context.provider.aggregateAllOf(ranking, aggregate);
        };
      }
    };
  }
}
