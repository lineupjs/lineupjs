import {IDataRow, IGroup, Column, AggregateGroupColumn, EAggregationState, IGroupParent, IOrderedGroup} from '../model';
import {AGGREGATE, CANVAS_HEIGHT, cssClass} from '../styles';
import {IRenderContext, ICellRendererFactory} from './interfaces';

function preventDefault(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}

function matchNodes(node: HTMLElement, group: IGroup, meta: IGroupMeta, col: AggregateGroupColumn) {
  const parents = groupParents(group, meta);
  const doc = node.ownerDocument!;
  const children = <HTMLElement[]>Array.from(node.children);
  // add missing
  for (let i = children.length; i < parents.length; ++i) {
    const child = doc.createElement('div');
    child.classList.add(cssClass('agg-level'));
    children.push(child);
    node.appendChild(child);
  }
  // remove too many
  for (const r of children.splice(parents.length, children.length - parent.length)) {
    r.remove();
  }

  // correct match
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
    child.title = isFirst ? 'Expand Group' : '';

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

  create(col: AggregateGroupColumn, context: IRenderContext) {
    const width = context.colWidth(col);
    return {
      template: `<div><div class="${cssClass('agg-level')}"></div></div>`,
      update(node: HTMLElement, _row: IDataRow, _i: number, group: IOrderedGroup) {
        // matchNodes(node, group, meta, col);
      },
      render(ctx: CanvasRenderingContext2D, _row: IDataRow, _i: number, _group: IGroup) {
        ctx.fillStyle = AGGREGATE.color;
        ctx.fillRect(width - AGGREGATE.width, 0, AGGREGATE.strokeWidth, CANVAS_HEIGHT);
        return Boolean(false);
      }
    };
  }

  createGroup(col: AggregateGroupColumn, context: IRenderContext) {
    const _showMore = context.provider.getShowTopN() > 0;
    return {
      template: `<div><div class="${cssClass('agg-level')}"></div></div>`,
      update(node: HTMLElement, group: IOrderedGroup) {
        // matchNodes(node, group, meta, col);

        // const children = <HTMLElement[]>Array.from(node.children);

        // const toggleMore = children.pop()!;

        // toggleMore.onclick = (event) => {
        //   preventDefault(event);
        //   col.setAggregated(group, isShowAll ? EAggregationState.EXPAND_TOP_N : EAggregationState.EXPAND);
        // };

        // const isGroupOnly = meta === 'first last';
        // const isTopX = meta === 'first top';
        // const isShowAll = !isGroupOnly && !isTopX;

        // toggleMore.title = isTopX ? 'Show All' : 'Show Top';
        // toggleMore.style.display = isGroupOnly || !showMore ? 'none' : null;
        // toggleMore.classList.toggle(cssClass('agg-compress'), isShowAll);

        // const toggleAggregate = children.pop()!;
        // toggleAggregate.title = isGroupOnly ? 'Expand Group' : 'Collapse Group';
        // toggleAggregate.classList.toggle(cssClass('agg-collapse'), isGroupOnly);
        // toggleAggregate.onclick = (event) => {
        //   preventDefault(event);
        //   col.setAggregated(group, isGroupOnly ? EAggregationState.EXPAND_TOP_N: EAggregationState.COLLAPSE);
        // };

        // // multi level TODO
        // {
        //   let g = group;
        //   while (g.parent && g.parent.subGroups[0] === g) {
        //     g = g.parent;
        //     const a = children.length > 0 ? children.pop()! : node.ownerDocument!.createElement('div');
        //     a.title = isGroupOnly ? 'Expand Group' : 'Collapse Group';
        //     a.classList.add(cssClass('agg-expand'));
        //     a.classList.toggle(cssClass('agg-collapse'), isGroupOnly);
        //     a.onclick = (event) => {
        //       preventDefault(event);
        //       col.setAggregated(g, isGroupOnly ? EAggregationState.EXPAND_TOP_N : EAggregationState.COLLAPSE);
        //     };
        //     node.insertAdjacentElement('afterbegin', a);
        //   }

        //   for(const child of children) {
        //     child.remove();
        //   }
        // }
      }
    };
  }

  createSummary(col: AggregateGroupColumn, context: IRenderContext) {
    return {
      template: `<div><div class="${cssClass('agg-expand')}"  title="Expand All Groups"></div><div class="${cssClass('agg-all')}"  title="Show All"></div></div>`,
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

        toggleAggregate.classList.toggle(cssClass('agg-collapse'), isGroupOnly);
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
