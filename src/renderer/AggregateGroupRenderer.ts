import {IDataRow, IGroup, IGroupMeta, Column, AggregateGroupColumn, EAggregationState} from '../model';
import {AGGREGATE, CANVAS_HEIGHT} from '../styles';
import {IRenderContext, ICellRendererFactory} from './interfaces';

function preventDefault(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}

/** @internal */
export default class AggregateGroupRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof AggregateGroupColumn;
  }

  create(col: AggregateGroupColumn, context: IRenderContext) {
    const width = context.colWidth(col);
    return {
      template: `<div><div></div></div>`,
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
      template: `<div><div title="Expand Group"></div><div title="Show All"></div></div>`,
      update(node: HTMLElement, group: IGroup, meta: IGroupMeta) {
        node.dataset.meta = meta!;

        const children = <HTMLElement[]>Array.from(node.children);

        const toggleMore = children.pop()!;

        toggleMore.onclick = (event) => {
          preventDefault(event);
          col.setAggregated(group, isShowAll ? EAggregationState.EXPAND_TOP_N : EAggregationState.EXPAND);
        };

        const isGroupOnly = meta === 'first last';
        const isTopX = meta === 'first top';
        const isShowAll = !isGroupOnly && !isTopX;

        toggleMore.title = isTopX ? 'Show All' : 'Show Top';

        const toggleAggregate = children.pop()!;
        toggleAggregate.title = isGroupOnly ? 'Expand Group' : 'Collapse Group';
        toggleAggregate.onclick = (event) => {
          preventDefault(event);
          col.setAggregated(group, isGroupOnly ? EAggregationState.EXPAND_TOP_N: EAggregationState.COLLAPSE);
        };

        {
          let g = group;
          while (g.parent && g.parent.subGroups[0] === g) {
            g = g.parent;
            const a = children.length > 0 ? children.pop()! : node.ownerDocument!.createElement('div');
            a.title = isGroupOnly ? 'Expand Group' : 'Collapse Group';
            a.onclick = (event) => {
              preventDefault(event);
              col.setAggregated(g, isGroupOnly ? EAggregationState.EXPAND_TOP_N : EAggregationState.COLLAPSE);
            };
            node.insertAdjacentElement('afterbegin', a);
          }

          for(const child of children) {
            child.remove();
          }
        }
      }
    };
  }

  createSummary(col: AggregateGroupColumn, context: IRenderContext) {
    return {
      template: `<div><div title="Expand All Groups"></div><div title="Show All"></div></div>`,
      update: (node: HTMLElement) => {
        const ranking = col.findMyRanker()!;
        const groups = ranking.getGroups();

        const toggleAggregate = <HTMLElement>node.firstElementChild!;
        const toggleMore = <HTMLElement>node.lastElementChild!;

        const isGroupOnly = groups.every((g) => col.isAggregated(g) === 'collapse');
        const meta: IGroupMeta = groups.length <= 1 ? null : (isGroupOnly ? 'first last' : 'first top');
        const isTopX = meta === 'first top';
        const isShowAll = !isGroupOnly && !isTopX;

        node.dataset.meta = meta!;
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
        toggleAggregate.onclick = function (event) {
          preventDefault(event);
          const ranking = col.findMyRanker();
          if (!ranking || !context) {
            return;
          }

          const meta = node.dataset.meta!;
          node.dataset.meta = meta === 'first last' ? 'first top' : 'first last';
          context.provider.aggregateAllOf(ranking, meta === 'first last' ? EAggregationState.EXPAND_TOP_N : EAggregationState.COLLAPSE);
        };
        toggleMore.onclick = function (event) {
          preventDefault(event);
          const ranking = col.findMyRanker();
          if (!ranking || !context) {
            return;
          }

          const meta = node.dataset.meta!;
          node.dataset.meta = meta === 'first top' ? 'first' : 'first top';
          context.provider.aggregateAllOf(ranking, meta === 'first top' ? EAggregationState.EXPAND : EAggregationState.EXPAND_TOP_N);
        };
      }
    };
  }
}
