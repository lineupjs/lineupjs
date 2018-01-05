import {IDataRow, IGroup} from '../model';
import AggregateGroupColumn from '../model/AggregateGroupColumn';
import Column from '../model/Column';
import {AGGREGATE, CANVAS_HEIGHT} from '../styles';
import {default as IRenderContext, ICellRendererFactory} from './interfaces';

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

  createSummary(col: AggregateGroupColumn, context: IRenderContext) {
    return {
      template: `<i class='lu-caret-down' title='(Un)Aggregate All'></i>`,
      update: (node: HTMLElement) => {
        let defaultValue = 'down';
        const ranking = col.findMyRanker();
        if (ranking) {
          const all = ranking.getGroups().every((g) => col.isAggregated(g));
          if (all) {
            defaultValue = 'right';
          }
        }
        node.className = `lu-caret-${defaultValue}`;

        node.onclick = (evt) => {
          evt.stopPropagation();
          const ranking = col.findMyRanker();
          if (!ranking || !context) {
            return;
          }
          const aggregate = node.classList.contains('lu-caret-down');
          node.classList.toggle('lu-caret-down');
          node.classList.toggle('lu-caret-right');
          context.provider.aggregateAllOf(ranking, aggregate);
        };
      }
    };
  }
}
