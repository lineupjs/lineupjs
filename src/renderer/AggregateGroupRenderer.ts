import {IDataRow, Column, AggregateGroupColumn, EAggregationState, IOrderedGroup, IGroupParent, IGroup, defaultGroup} from '../model';
import {AGGREGATE, CANVAS_HEIGHT, cssClass} from '../styles';
import {IRenderContext, ICellRendererFactory} from './interfaces';
import {IDataProvider} from '../provider';
import {groupParents, toItemMeta, isAlwaysShowingGroupStrategy, hasTopNStrategy, isSummaryGroup} from '../provider/internal';

function preventDefault(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}

function matchNodes(node: HTMLElement, length: number, clazz = 'agg-level', addTopN = false) {
  const doc = node.ownerDocument!;
  const children = <HTMLElement[]>Array.from(node.children);
  if (addTopN) { // top N buttons
    length = length + 1;
  }

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
  if (addTopN) {
    const last = children[children.length - 1];
    last.classList.remove(cssClass(clazz));
    last.classList.add(cssClass('agg-all'));
  }
  return children;
}

function renderGroups(node: HTMLElement, group: IOrderedGroup, relativeIndex: number, col: AggregateGroupColumn, provider: IDataProvider) {
  const strategy = provider.getAggregationStrategy();
  const ranking = col.findMyRanker()!;
  const topNGetter = (group: IGroup) => provider.getTopNAggregated(ranking, group);

  const isRow = relativeIndex >= 0;
  const isLeafGroup = !(<IGroupParent><any>group).subGroups || (<IGroupParent><any>group).subGroups.length === 0;

  const alwaysShowGroup = isAlwaysShowingGroupStrategy(strategy);
  const isSummary = !isRow && isSummaryGroup(group, strategy, topNGetter);
  const hasTopN = isSummary && isLeafGroup && hasTopNStrategy(strategy);

  const parents = groupParents(group, relativeIndex >= 0 ? toItemMeta(relativeIndex, group, provider.getTopNAggregated(ranking, group)) : 'first last');
  const children = matchNodes(node, parents.length, 'agg-level', hasTopN);

  const lastParent = parents.length - 1;

  for (let i = 0; i < parents.length; ++i) {
    const parent = parents[i];
    const child = children[i];
    const state = provider.getAggregationState(ranking, parent.group);
    const isLastGroup = i === lastParent;
    child.dataset.level = String(parents.length - 1 - i); // count backwards

    if (alwaysShowGroup && (isRow || i < lastParent)) {
      // inner or last
      if (!isSummary && (parent.meta === 'last' || parent.meta === 'first last')) {
        child.dataset.meta = 'last';
      } else {
        delete child.dataset.meta;
      }
      child.classList.toggle(cssClass('agg-inner'), isRow && isLastGroup);
      child.classList.remove(cssClass('agg-expand'), cssClass('agg-collapse'));
      child.title = '';
      delete child.onclick;
      continue;
    }

    const isCollapsed = state === EAggregationState.COLLAPSE;
    const isFirst = parent.meta === 'first' || parent.meta === 'first last';
    const isShowAll = state === EAggregationState.EXPAND;
    const childTopN = hasTopN && isLastGroup ? children[parents.length] : null;

    let meta = parent.meta;
    if (isSummary && parent.meta === 'first last') {
      meta = 'first';
    }

    if (meta) {
      child.dataset.meta = meta;
    } else {
      delete child.dataset.meta;
    }

    child.classList.toggle(cssClass('agg-expand'), isFirst);
    child.classList.toggle(cssClass('agg-collapse'), isCollapsed);
    child.title = isFirst ? (isCollapsed ? 'Expand Group' : 'Collapse Group') : '';

    if (!isFirst) {
      delete child.onclick;
    } else {
      child.onclick = (evt) => {
        preventDefault(evt);
        let nextState: EAggregationState;
        switch (strategy) {
          case 'group+top+item':
            nextState = state === EAggregationState.COLLAPSE ? EAggregationState.EXPAND_TOP_N : EAggregationState.COLLAPSE;
            break;
          case 'group':
          case 'item':
          case 'group+item':
          case 'group+item+top':
          default:
            nextState = state === EAggregationState.COLLAPSE ? EAggregationState.EXPAND : EAggregationState.COLLAPSE;
            break;
        }
        col.setAggregated(parent.group, nextState);
      };
    }

    if (!childTopN) {
      continue;
    }
    childTopN.dataset.level = String(i); // count upwards
    childTopN.classList.toggle(cssClass('agg-compress'), isShowAll);
    childTopN.title = isShowAll ? `Show Top ${provider.getShowTopN()} Only` : 'Show All';
    childTopN.onclick = (evt) => {
      preventDefault(evt);
      col.setAggregated(parent.group, state === EAggregationState.EXPAND ? EAggregationState.EXPAND_TOP_N : EAggregationState.EXPAND);
    };
  }
}

function isDummyGroup(group: IGroup) {
  return group.parent == null && group.name === defaultGroup.name;
}

/** @internal */
export default class AggregateGroupRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof AggregateGroupColumn;
  }

  create(col: AggregateGroupColumn, context: IRenderContext) {
    return {
      template: `<div></div>`,
      update(node: HTMLElement, _row: IDataRow, i: number, group: IOrderedGroup) {
        if (isDummyGroup(group)) {
          return;
        }
        renderGroups(node, group, i, col, context.provider);
      },
      render(ctx: CanvasRenderingContext2D, _row: IDataRow, i: number, group: IOrderedGroup) {
        if (isDummyGroup(group)) {
          return;
        }
        const parents = groupParents(group, toItemMeta(i, group, context.provider.getTopNAggregated(col.findMyRanker()!, group)));
        ctx.fillStyle = AGGREGATE.color;
        for (let i = 0; i < parents.length; ++i) {
          ctx.fillRect(AGGREGATE.levelWidth * i + AGGREGATE.levelOffset, 0, AGGREGATE.strokeWidth, CANVAS_HEIGHT);
        }
        return parents.some((d) => d.meta != null);
      }
    };
  }

  createGroup(col: AggregateGroupColumn, context: IRenderContext) {
    return {
      template: `<div><div class="${cssClass('agg-level')}"></div></div>`,
      update(node: HTMLElement, group: IOrderedGroup) {
        renderGroups(node, group, -1, col, context.provider);
      }
    };
  }

  createSummary(col: AggregateGroupColumn, context: IRenderContext) {
    return {
      template: `<div></div>`,
      update: (node: HTMLElement) => {
        const ranking = col.findMyRanker()!;
        const groups = ranking.getGroups();
        if (groups.length === 1 && groups[0].name === defaultGroup.name) {
          return;
        }

        const gparents = groups.map((group) => groupParents(group, 'first last'));

        const max = gparents.reduce((a, b) => Math.max(a, b.length), Number.NEGATIVE_INFINITY);
        const children = matchNodes(node, max, 'agg-expand');

        for (let i = 0; i < max; ++i) {
          const child = children[i];
          const subGroups = <IOrderedGroup[]>gparents.map((d) => d[i] ? d[i].group : null).filter((d) => d != null);

          const isCollapsed = subGroups.every((d) => context.provider.getAggregationState(ranking, d) === EAggregationState.COLLAPSE);
          child.classList.toggle(cssClass('agg-collapse'), isCollapsed);
          child.title = isCollapsed ? 'Expand All Groups' : 'Collapse All Groups';

          child.onclick = (evt) => {
            preventDefault(evt);
            context.provider.aggregateAllOf(ranking, isCollapsed ? EAggregationState.EXPAND : EAggregationState.COLLAPSE, subGroups);
          };
        }
      }
    };
  }
}
