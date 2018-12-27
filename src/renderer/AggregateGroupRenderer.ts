import {IDataRow, Column, AggregateGroupColumn, EAggregationState, IOrderedGroup} from '../model';
import {AGGREGATE, CANVAS_HEIGHT, cssClass} from '../styles';
import {IRenderContext, ICellRendererFactory} from './interfaces';
import {groupParents, toItemMeta} from '../model/internal';

function preventDefault(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}

function matchNodes(node: HTMLElement, length: number, clazz = 'agg-level') {
  const doc = node.ownerDocument!;
  const children = <HTMLElement[]>Array.from(node.children);
  // add missing
  for (let i = children.length; i < length; ++i) {
    const child = doc.createElement('div');
    child.classList.add(cssClass(clazz));
    children.push(child);
    node.appendChild(child);
  }
  // remove too many
  for (const r of children.splice(length, children.length - length)) {
    r.remove();
  }
  return children;
}

function renderGroups(node: HTMLElement, group: IOrderedGroup, relativeIndex: number, col: AggregateGroupColumn) {
  const parents = groupParents(group, relativeIndex >= 0 ? toItemMeta(relativeIndex, group) : 'first last');
  const children = matchNodes(node, parents.length);

  for (let i = 0; i < parents.length; ++i) {
    const parent = parents[i];
    const child = children[i];
    child.dataset.level = String(parents.length - 1 - i); // count backwards
    if (parent.meta) {
      child.dataset.meta = parent.meta;
    } else {
      delete child.dataset.meta;
    }
    const isFirst = parent.meta === 'first' || parent.meta === 'first last';
    const isCollapsed = parent.meta === 'first last';
    child.classList.toggle(cssClass('agg-expand'), isFirst);
    child.classList.toggle(cssClass('agg-collapse'), isCollapsed);
    child.title = isFirst ? (isCollapsed ? 'Expand Group' : 'Collapse Group') : '';

    child.onclick = !isFirst ? null : (evt) => {
      preventDefault(evt);
      col.setAggregated(parent.group, isCollapsed ? EAggregationState.EXPAND : EAggregationState.COLLAPSE);
    };
  }
}

/** @internal */
export default class AggregateGroupRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof AggregateGroupColumn;
  }

  create(col: AggregateGroupColumn) {
    return {
      template: `<div><div class="${cssClass('agg-level')}"></div></div>`,
      update(node: HTMLElement, _row: IDataRow, i: number, group: IOrderedGroup) {
        renderGroups(node, group, i, col);
      },
      render(ctx: CanvasRenderingContext2D, _row: IDataRow, i: number, group: IOrderedGroup) {
        const parents = groupParents(group, toItemMeta(i, group));
        ctx.fillStyle = AGGREGATE.color;
        for (let i = 0; i < parents.length; ++i) {
          ctx.fillRect(AGGREGATE.levelWidth * i + AGGREGATE.levelOffset, 0, AGGREGATE.strokeWidth, CANVAS_HEIGHT);
        }
        return parents.some((d) => d.meta != null);
      }
    };
  }

  createGroup(col: AggregateGroupColumn) {
    // const _showMore = context.provider.getShowTopN() > 0;
    return {
      template: `<div><div class="${cssClass('agg-level')}"></div></div>`,
      update(node: HTMLElement, group: IOrderedGroup) {
        renderGroups(node, group, -1, col);

        // TODO show all / show top behavior again
      }
    };
  }

  createSummary(col: AggregateGroupColumn, context: IRenderContext) {
    return {
      template: `<div><div class="${cssClass('agg-expand')}" title="Expand All Groups"></div></div>`,
      update: (node: HTMLElement) => {
        const ranking = col.findMyRanker()!;
        const groups = ranking.getGroups();
        const gparents = groups.map((group) => groupParents(group, 'first last'));

        const max = gparents.reduce((a, b) => Math.max(a, b.length), Number.NEGATIVE_INFINITY);
        const children = matchNodes(node, max, 'agg-expand');

        for (let i = 0; i < max; ++i) {
          const child = children[i];
          const subGroups = <IOrderedGroup[]>gparents.map((d) => d[i] ? d[i].group : null).filter((d) => d != null);

          const isCollapsed = subGroups.every((d) => context.provider.getAggregationState(ranking, d) === EAggregationState.COLLAPSE);
          child.classList.toggle(cssClass('agg-collapse'), isCollapsed);
          child.title = isCollapsed ? 'Expand Group' : 'Collapse Group';

          child.onclick = (evt) => {
            preventDefault(evt);
            context.provider.aggregateAllOf(ranking, isCollapsed ? EAggregationState.EXPAND : EAggregationState.COLLAPSE, subGroups);
          };
        }

        // const toggleAggregate = <HTMLElement>node.firstElementChild!;
        // const toggleMore = <HTMLElement>node.lastElementChild!;

        // const isGroupOnly = groups.every((g) => col.isAggregated(g) === 'collapse');
        // const meta: IGroupMeta = groups.length <= 1 ? null : (isGroupOnly ? 'first last' : 'first top');
        // const isTopX = meta === 'first top';
        // const isShowAll = !isGroupOnly && !isTopX;

        // node.dataset.meta = meta!;
        // if (isShowAll) {
        //   // expanded
        //   toggleAggregate.title = 'Collapse Group';
        //   toggleMore.title = 'Show Top';
        // } else if (isGroupOnly) {
        //   // collapse
        //   toggleAggregate.title = 'Expand Group';
        //   toggleMore.title = 'Show Top';
        // } else {
        //   // show top
        //   toggleAggregate.title = 'Collapse Group';
        //   toggleMore.title = 'Show All';
        // }

        // toggleAggregate.classList.toggle(cssClass('agg-collapse'), isGroupOnly);
        // toggleAggregate.onclick = function (event) {
        //   preventDefault(event);
        //   const ranking = col.findMyRanker();
        //   if (!ranking || !context) {
        //     return;
        //   }

        //   const meta = node.dataset.meta!;
        //   node.dataset.meta = meta === 'first last' ? 'first top' : 'first last';
        //   context.provider.aggregateAllOf(ranking, meta === 'first last' ? EAggregationState.EXPAND_TOP_N : EAggregationState.COLLAPSE);
        // };
        // toggleMore.onclick = function (event) {
        //   preventDefault(event);
        //   const ranking = col.findMyRanker();
        //   if (!ranking || !context) {
        //     return;
        //   }

        //   const meta = node.dataset.meta!;
        //   node.dataset.meta = meta === 'first top' ? 'first' : 'first top';
        //   context.provider.aggregateAllOf(ranking, meta === 'first top' ? EAggregationState.EXPAND : EAggregationState.EXPAND_TOP_N);
        // };
      }
    };
  }
}
