import {IDataRow, IGroup, IGroupMeta} from '../model';
import AggregateGroupColumn from '../model/AggregateGroupColumn';
import Column from '../model/Column';
import {AGGREGATE, CANVAS_HEIGHT, cssClass} from '../styles';
import {default as IRenderContext, ICellRendererFactory} from './interfaces';

const AGGREGATE_TO_TOP = 0;

/** @internal */
export default class AggregateGroupRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof AggregateGroupColumn;
  }

  create(col: AggregateGroupColumn, context: IRenderContext) {
    const width = context.colWidth(col);
    return {
      template: `<div></div>`,
      update(node: HTMLElement, _row: IDataRow, _i: number, _group: IGroup, meta: IGroupMeta) {
        if (!meta) {
          delete node.dataset.meta;
        } else {
          node.dataset.meta = meta;
        }
      },
      render(ctx: CanvasRenderingContext2D, _row: IDataRow, _i: number, _group: IGroup, meta: IGroupMeta) {
        ctx.fillStyle = AGGREGATE.color;
        ctx.fillRect(width - AGGREGATE.width, 0, AGGREGATE.strokeWidth, CANVAS_HEIGHT);
        return Boolean(meta);
      }
    };
  }

  createGroup(col: AggregateGroupColumn) {
    return {
      template: `<div><div title="Expand Group"></div><div title="Show All | Show Top ${AGGREGATE_TO_TOP}"></div></div>`,
      update(node: HTMLElement, group: IGroup, meta: IGroupMeta) {
        const toggleAggregate = <HTMLElement>node.firstElementChild!;
        const toggleMore = <HTMLElement>node.lastElementChild!;

        const isGroupOnly = meta === 'first last';
        const isTopX = meta === 'first top';
        const isShowAll = !isGroupOnly && !isTopX;

        if (isShowAll) {
          // expanded
          toggleAggregate.title = 'Collapse Group';
          toggleMore.title = 'Show Top';
        } else if (isGroupOnly) {
          // collapse
          toggleAggregate.title = 'Expand Group';
          toggleMore.title = 'Show Top';
        } else {
          // show top
          toggleAggregate.title = 'Collapse Group';
          toggleMore.title = 'Show All';
        }
        node.dataset.meta = meta!;
        toggleAggregate.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          col.setAggregated(group, isGroupOnly ? 'expand_top' : 'collapse');
        };
        toggleMore.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          col.setAggregated(group, isShowAll ? 'expand_top' : 'expand');
        };
      }
    };
  }

  createSummary(col: AggregateGroupColumn, context: IRenderContext) {
    const cdown = cssClass('icon-caret-down');
    const cright = cssClass('icon-caret-right');
    return {
      template: `<div title="(Un)Aggregate All" class="${cdown}"></div>`,
      update: (node: HTMLElement) => {
        const ranking = col.findMyRanker();
        const right = Boolean(ranking && ranking.getGroups().every((g) => col.isAggregated(g) >= 0));

        node.classList.toggle(cdown, !right);
        node.classList.toggle(cright, right);

        node.onclick = (evt) => {
          evt.stopPropagation();
          const ranking = col.findMyRanker();
          if (!ranking || !context) {
            return;
          }
          const aggregate = node.classList.contains(cdown);
          node.classList.toggle(cdown, !aggregate);
          node.classList.toggle(cright, aggregate);
          context.provider.aggregateAllOf(ranking, aggregate ? AGGREGATE_TO_TOP : -1);
        };
      }
    };
  }
}
