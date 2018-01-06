import {MIN_LABEL_WIDTH} from '../config';
import {dragAble, dropAble, IDropResult} from '../internal/dnd';
import {equalArrays} from '../internal/utils';
import {createNestedDesc, createStackDesc, isCategoricalColumn, isNumberColumn, isSupportType} from '../model';
import Column from '../model/Column';
import {default as CompositeColumn, IMultiLevelColumn, isMultiLevelColumn} from '../model/CompositeColumn';
import ImpositionCompositeColumn from '../model/ImpositionCompositeColumn';
import Ranking from '../model/Ranking';
import {IRankingHeaderContext} from './interfaces';
import toolbarActions, {IOnClickHandler, more} from './toolbar';


/**
 * utility function to generate the tooltip text with description
 * @param col the column
 */
export function toFullTooltip(col: { label: string, description?: string }) {
  let base = col.label;
  if (col.description != null && col.description !== '') {
    base += `\n${col.description}`;
  }
  return base;
}

export interface IHeaderOptions {
  dragAble: boolean;
  mergeDropAble: boolean;
  rearrangeAble: boolean;
  resizeable: boolean;
}

export function createHeader(col: Column, ctx: IRankingHeaderContext, options: Partial<IHeaderOptions> = {}) {
  options = Object.assign({
    dragAble: true,
    mergeDropAble: true,
    rearrangeAble: true,
    resizeable: true
  }, options);
  const node = ctx.document.createElement('section');
  node.innerHTML = `
    <div class="lu-label">${col.getWidth() < MIN_LABEL_WIDTH ? '&nbsp;': col.label}</div>
    <div class="lu-toolbar"></div>
    <div class="lu-spacing"></div>
    <div class="lu-handle"></div>
  `;
  createToolbar(<HTMLElement>node.querySelector('div.lu-toolbar')!, col, ctx);

  toggleToolbarIcons(node, col);

  if (options.dragAble) {
    dragAbleColumn(node, col, ctx);
  }
  if (options.mergeDropAble) {
    mergeDropAble(node, col, ctx);
  }
  if (options.rearrangeAble) {
    rearrangeDropAble(<HTMLElement>node.querySelector('.lu-handle')!, col, ctx);
  }
  if (options.resizeable) {
    dragWidth(col, node);
  }
  return node;
}

export function updateHeader(node: HTMLElement, col: Column) {
  node.querySelector('.lu-label')!.innerHTML = col.getWidth() < MIN_LABEL_WIDTH ? '&nbsp;': col.label;
  node.title = toFullTooltip(col);

  const sort = <HTMLElement>node.querySelector(`i[title='Sort']`)!;
  if (sort) {
    const {asc, priority} = col.isSortedByMe();
    sort.dataset.sort = asc !== undefined ? asc : '';
    if (priority !== undefined) {
      sort.dataset.priority = (parseInt(priority, 10) + 1).toString();
    } else {
      delete sort.dataset.priority;
    }
  }

  const stratify = <HTMLElement>node.querySelector(`i[title^='Stratify']`)!;
  if (!stratify) {
    return;
  }
  const groupedBy = col.isGroupedBy();
  stratify.dataset.stratify = groupedBy >= 0 ? 'true' : 'false';
  if (groupedBy >= 0) {
    stratify.dataset.priority = (groupedBy + 1).toString();
  } else {
    delete stratify.dataset.priority;
  }
}

export function addIconDOM(node: HTMLElement, col: Column, ctx: IRankingHeaderContext, showLabel: boolean) {
  return (title: string, onClick: IOnClickHandler) => {
    node.insertAdjacentHTML('beforeend', `<i title="${title}"><span${!showLabel ? ' aria-hidden="true"' : ''}>${title}</span> </i>`);
    const i = <HTMLElement>node.lastElementChild;
    i.onclick = (evt) => {
      evt.stopPropagation();
      onClick(col, <any>evt, ctx);
    };
    return i;
  };
}

export function createToolbar(node: HTMLElement, col: Column, ctx: IRankingHeaderContext) {
  return createShortcutMenuItems(<any>addIconDOM(node, col, ctx, false), col, ctx);
}

interface IAddIcon {
  (title: string, onClick: IOnClickHandler): void;
}

export function createShortcutMenuItems(addIcon: IAddIcon, col: Column, ctx: IRankingHeaderContext) {
  const actions = toolbarActions(col, ctx);

  actions.filter((d) => d.options.shortcut).forEach((d) => addIcon(d.title, d.onClick));
}

export function createToolbarMenuItems(addIcon: IAddIcon, col: Column, ctx: IRankingHeaderContext) {
  const actions = toolbarActions(col, ctx);

  actions.filter((d) => d !== more).forEach((d) => addIcon(d.title, d.onClick));
}

function toggleToolbarIcons(node: HTMLElement, col: Column, defaultVisibleClientWidth = 22.5) {
  const toolbar = <HTMLElement>node.querySelector('.lu-toolbar');
  const moreIcon = toolbar.querySelector('[title^=More]')!;
  const availableWidth = col.getWidth() - (moreIcon.clientWidth || defaultVisibleClientWidth);
  const toggableIcons = Array.from(toolbar.children).filter((d) => d !== moreIcon)
    .reverse(); // start hiding with the last icon

  toggableIcons.forEach((icon) => {
    icon.classList.remove('hidden'); // first show all icons to calculate the correct `clientWidth`
  });
  toggableIcons.forEach((icon) => {
    const currentWidth = toggableIcons.reduce((a, b) => {
      const realWidth = b.clientWidth;
      if (realWidth > 0) {
        return a + realWidth;
      }
      if (!b.classList.contains('hidden')) { // since it may have not yet been layouted
        return a + defaultVisibleClientWidth;
      }
      return a;
    }, 0);
    icon.classList.toggle('hidden', (currentWidth > availableWidth)); // hide icons if necessary
  });
}

/**
 * allow to change the width of a column using dragging the handle
 */
export function dragWidth(col: Column, node: HTMLElement) {
  let ueberElement: HTMLElement;
  const handle = <HTMLElement>node.querySelector('.lu-handle');


  let start = 0;
  const mouseMove = (evt: MouseEvent) => {
    evt.stopPropagation();
    evt.preventDefault();
    const end = evt.clientX;
    if (Math.abs(start - end) < 2) {
      //ignore
      return;
    }
    const delta = end - start;
    start = end;
    const width = Math.max(0, col.getWidth() + delta);
    col.setWidth(width);
    toggleToolbarIcons(node, col);
  };

  const mouseUp = (evt: MouseEvent) => {
    evt.stopPropagation();
    evt.preventDefault();
    const end = evt.clientX;
    node.classList.remove('lu-change-width');

    ueberElement.removeEventListener('mousemove', mouseMove);
    ueberElement.removeEventListener('mouseup', mouseUp);
    ueberElement.removeEventListener('mouseleave', mouseUp);

    if (Math.abs(start - end) < 2) {
      //ignore
      return;
    }
    const delta = end - start;
    const width = Math.max(0, col.getWidth() + delta);
    col.setWidth(width);
    toggleToolbarIcons(node, col);
  };
  handle.onmousedown = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    node.classList.add('lu-change-width');

    start = evt.clientX;
    ueberElement = <HTMLElement>node.closest('header')!;
    ueberElement.addEventListener('mousemove', mouseMove);
    ueberElement.addEventListener('mouseup', mouseUp);
    ueberElement.addEventListener('mouseleave', mouseUp);
  };
  handle.onclick = (evt) => {
    // avoid resorting
    evt.stopPropagation();
    evt.preventDefault();
  };
}

export const MIMETYPE_PREFIX = 'text/x-caleydo-lineup-column';

/**
 * allow to drag the column away
 */
export function dragAbleColumn(node: HTMLElement, column: Column, ctx: IRankingHeaderContext) {
  dragAble(node, () => {
    const ref = JSON.stringify(ctx.provider.toDescRef(column.desc));
    const data: any = {
      'text/plain': column.label,
      [`${MIMETYPE_PREFIX}-ref`]: column.id,
      [MIMETYPE_PREFIX]: ref
    };
    if (isNumberColumn(column)) {
      data[`${MIMETYPE_PREFIX}-number`] = ref;
      data[`${MIMETYPE_PREFIX}-number-ref`] = column.id;
    }
    return {
      effectAllowed: 'copyMove',
      data
    };
  }, true);
}

/**
 * dropper for allowing to rearrange (move, copy) columns
 */
export function rearrangeDropAble(node: HTMLElement, column: Column, ctx: IRankingHeaderContext) {
  dropAble(node, [`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX], (result) => {
    let col: Column | null = null;
    const data = result.data;
    if (!(`${MIMETYPE_PREFIX}-ref` in data)) {
      const desc = JSON.parse(data[MIMETYPE_PREFIX]);
      col = ctx.provider.create(ctx.provider.fromDescRef(desc));
      return col != null && column.insertAfterMe(col) != null;
    }

    // find by reference
    const id = data[`${MIMETYPE_PREFIX}-ref`];
    col = ctx.provider.find(id);
    if (!col || (col === column && !result.effect.startsWith('copy'))) {
      return false;
    }
    if (result.effect.startsWith('copy')) {
      col = ctx.provider.clone(col!);
      return col != null && column.insertAfterMe(col) != null;
    }
    // detect whether it is an internal move operation or an real remove/insert operation
    const toInsertParent = col.parent;
    if (!toInsertParent) { // no parent will always be a move
      return column.insertAfterMe(col) != null;
    }
    if (toInsertParent === column.parent) {
      // move operation
      return toInsertParent.moveAfter(col, column) != null;
    }
    col.removeMe();
    return column.insertAfterMe(col) != null;
  }, null, true);
}

/**
 * dropper for allowing to change the order by dropping it at a certain position
 */
export function resortDropAble(node: HTMLElement, column: Column, ctx: IRankingHeaderContext, where: 'before' | 'after', autoGroup: boolean) {
  dropAble(node, [`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX], (result) => {
    let col: Column | null = null;
    const data = result.data;
    if (`${MIMETYPE_PREFIX}-ref` in data) {
      const id = data[`${MIMETYPE_PREFIX}-ref`];
      col = ctx.provider.find(id);
      if (!col || col === column) {
        return false;
      }
    } else {
      const desc = JSON.parse(data[MIMETYPE_PREFIX]);
      col = ctx.provider.create(ctx.provider.fromDescRef(desc));
      if (col) {
        column.findMyRanker()!.push(col);
      }
    }
    const ranking = column.findMyRanker()!;
    if (!col || col === column || !ranking) {
      return false;
    }

    const criteria = ranking.getSortCriterias();
    const groups = ranking.getGroupCriteria();

    const removeFromSort = (col: Column) => {
      const existing = criteria.findIndex((d) => d.col === col);
      if (existing >= 0) { // remove existing column but keep asc state
        return criteria.splice(existing, 1)[0].asc;
      }
      return false;
    };

    // remove the one to add
    const asc = removeFromSort(col);

    const groupIndex = groups.indexOf(column);
    const index = criteria.findIndex((d) => d.col === column);

    if (autoGroup && groupIndex >= 0) {
      // before the grouping, so either ungroup or regroup
      removeFromSort(column);
      if (isCategoricalColumn(col)) { // we can group by it
        groups.splice(groupIndex + (where === 'after' ? 1 : 0), 0, col);
        if (groups.length > ranking.getMaxGroupColumns()) {
          // move the rest to sorting
          const removed = groups.splice(0, groups.length - ranking.getMaxGroupColumns());
          criteria.unshift(...removed.reverse().map((d) => ({asc: false, col: d}))); // now a first sorting criteria
        }
      } else {
        // remove all before and shift to sorting + sorting
        const removed = groups.splice(0, groups.length - groupIndex);
        criteria.unshift(...removed.reverse().map((d) => ({asc: false, col: d}))); // now a first sorting criteria
        criteria.unshift({asc, col});
      }
    } else if (index < 0) {
      criteria.push({asc, col});
    } else if (index === 0 && autoGroup && isCategoricalColumn(col)) {
      // make group criteria
      groups.push(col);
    } else {
      criteria.splice(index + (where === 'after' ? 1 : 0), 0, {asc, col});
    }

    if (!equalArrays(groups, ranking.getGroupCriteria())) {
      ranking.groupBy(groups);
    }
    ranking.setSortCriteria(criteria);
    return true;
  }, null, true);
}

/**
 * dropper for merging columns
 */
export function mergeDropAble(node: HTMLElement, column: Column, ctx: IRankingHeaderContext) {
  const resolveDrop = (result: IDropResult, numbersOnly: boolean) => {
    const data = result.data;
    const copy = result.effect === 'copy';
    const prefix = `${MIMETYPE_PREFIX}${numbersOnly ? '-number' : ''}`;
    if (`${prefix}-ref` in data) {
      const id = data[`${prefix}-ref`];
      let col: Column = ctx.provider.find(id)!;
      if (copy) {
        col = ctx.provider.clone(col);
      } else if (col === column) {
        return null;
      } else {
        col.removeMe();
      }
      return col;
    }
    const desc = JSON.parse(data[prefix]);
    return ctx.provider.create(ctx.provider.fromDescRef(desc))!;
  };

  if (isMultiLevelColumn(column)) {
    if ((<IMultiLevelColumn>column).canJustAddNumbers) {
      dropAble(node, [`${MIMETYPE_PREFIX}-number-ref`, `${MIMETYPE_PREFIX}-number`], (result) => {
        const col: Column | null = resolveDrop(result, true);
        return col != null && (<IMultiLevelColumn>column).push(col) != null;
      });
    } else {
      dropAble(node, [`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX], (result) => {
        const col: Column | null = resolveDrop(result, false);
        return col != null && (<IMultiLevelColumn>column).push(col) != null;
      });
    }
    return;
  }

  const justNumbers = (d: Column) => (d instanceof CompositeColumn && d.canJustAddNumbers) || (isNumberColumn(d) && d.parent instanceof Ranking && !(d instanceof ImpositionCompositeColumn));
  const dropOrMerge = (justNumbers: boolean) => {
    return (result: IDropResult) => {
      const col: Column | null = resolveDrop(result, justNumbers);
      if (!col) {
        return false;
      }
      if (column instanceof CompositeColumn) {
        return (column.push(col) != null);
      }
      const ranking = column.findMyRanker()!;
      const index = ranking.indexOf(column);
      const parent = <CompositeColumn>ctx.provider.create(justNumbers ? createStackDesc() : createNestedDesc());
      column.removeMe();
      parent.push(column);
      parent.push(col);
      return ranking.insert(parent, index) != null;
    };
  };

  if (justNumbers(column)) {
    dropAble(node, [`${MIMETYPE_PREFIX}-number-ref`, `${MIMETYPE_PREFIX}-number`], dropOrMerge(true));
  } else {
    dropAble(node, [`${MIMETYPE_PREFIX}-ref`, `${MIMETYPE_PREFIX}`], dropOrMerge(false));
  }
}
