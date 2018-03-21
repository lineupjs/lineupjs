/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import Column from '../../model/Column';
import {createNestedDesc, createStackDesc, isSupportType} from '../../model';
import NumbersColumn from '../../model/NumbersColumn';
import BoxPlotColumn from '../../model/BoxPlotColumn';
import SortDialog from '../../dialogs/SortDialog';
import RenameDialog from '../../dialogs/RenameDialog';
import ChangeRendererDialog from '../../dialogs/ChangeRendererDialog';
import LinkColumn from '../../model/LinkColumn';
import ADialog, {IMaskRect} from '../../dialogs/ADialog';
import ScriptColumn from '../../model/ScriptColumn';
import ScriptEditDialog from '../../dialogs/ScriptEditDialog';
import EditLinkDialog from '../../dialogs/EditLinkDialog';
import {default as CompositeColumn, IMultiLevelColumn, isMultiLevelColumn} from '../../model/CompositeColumn';
import RankColumn from '../../model/RankColumn';
import WeightsEditDialog from '../../dialogs/WeightsEditDialog';
import StackColumn from '../../model/StackColumn';
import CutOffHierarchyDialog from '../../dialogs/CutOffHierarchyDialog';
import SearchDialog from '../../dialogs/SearchDialog';
import SortGroupDialog from '../../dialogs/SortGroupDialog';
import HierarchyColumn from '../../model/HierarchyColumn';
import {dragAble, dropAble, IDropResult} from './dnd';
import NumberColumn from '../../model/NumberColumn';
import {isNumberColumn} from '../../model';
import Ranking from '../../model/Ranking';
import {isCategoricalColumn} from '../../model';
import StratifyThresholdDialog from '../../dialogs/StratifyThresholdDialog';
import {IRankingHeaderContext} from './interfaces';
import {equalArrays} from '../../utils';
import MoreColumnOptionsDialog from '../../dialogs/MoreColumnOptionsDialog';
import {findTypeLike} from '../../model/utils';
import SelectionColumn from '../../model/SelectionColumn';
import CompositeChildrenDialog from '../../dialogs/CompositeChildrenDialog';
import StringColumn from '../../model/StringColumn';
import ImpositionCompositeColumn from '../../model/ImpositionCompositeColumn';
import GroupColumn from '../../model/GroupColumn';


/**
 * utility function to generate the tooltip text with description
 * @param col the column
 */
export function toFullTooltip(col: {label: string, description?: string}) {
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

export function createHeader(col: Column, document: Document, ctx: IRankingHeaderContext, options: Partial<IHeaderOptions> = {}) {
  options = Object.assign({
    dragAble: true,
    mergeDropAble: true,
    rearrangeAble: true,
    resizeable: true
  }, options);
  const node = document.createElement('section');
  node.innerHTML = `
    <div class="lu-label">${col.label}</div>
    <div class="lu-toolbar"></div>
    <div class="lu-spacing"></div>
    <div class="lu-summary"></div>
    <div class="lu-handle"></div>
  `;

  const dialogBackdropMask: () => IMaskRect = () => {
    const mask = node.getBoundingClientRect();
    // manipulate bottom to highlight the whole column (and not only the header)
    return {top: mask.top, left: mask.left, right: mask.right, bottom: document.body.clientHeight};
  };

  createToolbar(<HTMLElement>node.querySelector('div.lu-toolbar')!, col, ctx, dialogBackdropMask);

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

export function updateHeader(node: HTMLElement, col: Column, ctx: IRankingHeaderContext, interactive: boolean = false) {
  node.querySelector('.lu-label')!.innerHTML = col.label;
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
  if (stratify) {
    const groupedBy = col.isGroupedBy();
    stratify.dataset.stratify = groupedBy >= 0 ? 'true' : 'false';
    if (groupedBy >= 0) {
      stratify.dataset.priority = (groupedBy + 1).toString();
    } else {
      delete stratify.dataset.priority;
    }
  }

  const summary = findTypeLike(col, ctx.summaries);
  if (summary) {
    summary(col, <HTMLElement>node.querySelector('.lu-summary')!, interactive, ctx);
  }
}

export function addIconDOM(node: HTMLElement, col: Column, showLabel: boolean) {
  return (title: string, dialogClass?: {new(col: any, header: HTMLElement, ...args: any[]): ADialog}, ...dialogArgs: any[]) => {
    node.insertAdjacentHTML('beforeend', `<i title="${title}"><span${!showLabel ? ' aria-hidden="true"' : ''}>${title}</span> </i>`);
    const i = <HTMLElement>node.lastElementChild;
    if (!dialogClass) {
      return i;
    }
    i.onclick = (evt) => {
      evt.stopPropagation();
      const dialog = new dialogClass(col, i, ...dialogArgs);
      dialog.open();
    };
    return i;
  };
}

export function createToolbar(node: HTMLElement, col: Column, ctx: IRankingHeaderContext, dialogBackdropMask: () => IMaskRect) {
  return createShortcutMenuItems(<any>addIconDOM(node, col, false), col, ctx, dialogBackdropMask);
}

interface IAddIcon {
  (title: string, dialogClass?: {new(col: any, header: HTMLElement, ...args: any[]): ADialog}, ...dialogArgs: any[]): {onclick: (evt: {stopPropagation: () => void, currentTarget: Element, [key: string]: any}) => any};
}

export function createShortcutMenuItems(addIcon: IAddIcon, col: Column, ctx: IRankingHeaderContext, dialogBackdropMask: () => IMaskRect) {

  if (!isSupportType(col.desc) || col instanceof SelectionColumn) {
    addIcon('Sort').onclick = (evt) => {
      evt.stopPropagation();
      col.toggleMySorting();
    };
  }

  if (col instanceof GroupColumn) {
    addIcon('Sort Group by &hellip;', SortGroupDialog, dialogBackdropMask);
  }

  //stratify
  if (isCategoricalColumn(col)) {
    addIcon('Stratify').onclick = (evt) => {
      evt.stopPropagation();
      col.groupByMe();
    };
  }

  if (col instanceof NumberColumn) {
    addIcon('Stratify by Threshold &hellip;', StratifyThresholdDialog, dialogBackdropMask);
  }

  if (!(col instanceof RankColumn)) {
    addIcon('Remove').onclick = (evt) => {
      evt.stopPropagation();
      if (!(col instanceof RankColumn)) {
        col.removeMe();
        return;
      }
      ctx.provider.removeRanking(col.findMyRanker()!);
      ctx.provider.ensureOneRanking();
    };
  }

  addIcon('More &hellip;', MoreColumnOptionsDialog, '', ctx, dialogBackdropMask);
}

export function createToolbarMenuItems(addIcon: IAddIcon, col: Column, ctx: IRankingHeaderContext) {
  const isSupportColumn = isSupportType(col.desc);

  if (!isSupportColumn) {
    //rename
    addIcon('Rename + Color &hellip;', RenameDialog);
  }

  if (!isSupportType(col.desc) || col instanceof SelectionColumn) {
    addIcon('Sort').onclick = (evt) => {
      evt.stopPropagation();
      col.toggleMySorting();
    };
  }

  if (col instanceof NumbersColumn || col instanceof BoxPlotColumn) {
    //Numbers Sort
    addIcon('Sort by &hellip;', SortDialog);
  }

  if (col instanceof StringColumn) {
    addIcon('Sort Group by Name').onclick = (evt) => {
      evt.stopPropagation();
      col.toggleMyGroupSorting();
    };
  }

  if (col instanceof NumberColumn) {
    addIcon('Sort Group by &hellip;', SortDialog);
  }

  if (col instanceof GroupColumn) {
    addIcon('Sort Group by &hellip;', SortGroupDialog);
  }

  //stratify
  if (isCategoricalColumn(col) || col instanceof SelectionColumn) {
    addIcon('Stratify').onclick = (evt) => {
      evt.stopPropagation();
      col.groupByMe();
    };
  }

  if (col instanceof NumberColumn) {
    addIcon('Stratify by Threshold &hellip;', StratifyThresholdDialog);
  }

  const possible = ctx.getPossibleRenderer(col);
  if (possible.item.length > 2 || possible.group.length > 2) { // default always possible
    //Renderer Change
    addIcon('Visualization &hellip;', ChangeRendererDialog, ctx);
  }

  if (col instanceof LinkColumn) {
    //edit link
    addIcon('Edit Link Pattern &hellip;', EditLinkDialog, ctx.idPrefix, (<string[]>[]).concat((<any>col.desc).templates || [], ctx.linkTemplates));
  }

  if (col instanceof ScriptColumn) {
    //edit script
    addIcon('Edit Combine Script &hellip;', ScriptEditDialog);
  }

  //filter
  const filter = findTypeLike(col, ctx.filters);
  if (filter) {
    addIcon('Filter &hellip;', filter, '', ctx.provider, ctx.idPrefix);
  }

  if (col instanceof HierarchyColumn) {
    //cutoff
    addIcon('Set Cut Off &hellip;', CutOffHierarchyDialog, ctx.idPrefix);
  }

  if (ctx.searchAble(col)) {
    //search
    addIcon('Search &hellip;', SearchDialog, ctx.provider);
  }

  if (col instanceof StackColumn) {
    //edit weights
    addIcon('Edit Weights &hellip;', WeightsEditDialog);
  }

  if (isMultiLevelColumn(col)) {
    const mcol = <IMultiLevelColumn>col;
    addIcon(mcol.getCollapsed() ? 'Expand' : 'Compress').onclick = (evt) => {
      evt.stopPropagation();
      mcol.setCollapsed(!mcol.getCollapsed());
      const i = <HTMLElement>evt.currentTarget;
      i.title = mcol.getCollapsed() ? 'Expand' : 'Compress';
    };
  }

  if (col instanceof CompositeColumn && col.parent instanceof Ranking) {
    addIcon('Split Combined Column').onclick = (evt) => {
      evt.stopPropagation();
      // split the combined column into its children
      col.children.reverse().forEach((c) => col.insertAfterMe(c));
      col.removeMe();
    };
  }

  if (col instanceof CompositeColumn && (!isMultiLevelColumn(col) || col.getCollapsed())) {
    addIcon('Contained Columns &hellip;', CompositeChildrenDialog, ctx);
  }

  if (!isSupportColumn) {
    //clone
    addIcon('Generate Snapshot').onclick = (evt) => {
      evt.stopPropagation();
      ctx.provider.takeSnapshot(col);
    };
  }

  addIcon('Remove').onclick = (evt) => {
    evt.stopPropagation();
    if (!(col instanceof RankColumn)) {
      col.removeMe();
      return;
    }
    ctx.provider.removeRanking(col.findMyRanker()!);
    ctx.provider.ensureOneRanking();
  };
}

/** @internal */
function toggleRotatedHeader(node: HTMLElement, col: Column, defaultVisibleClientWidth = 22.5) {
  // rotate header flag if needed
  const label = <HTMLElement>node.querySelector('.lu-label');
  const width = label.clientWidth;
  const rotated = width <= 0 ? (col.label.length * defaultVisibleClientWidth / 3 * 0.8 > col.getWidth()) : (label.scrollWidth * 0.8 > label.clientWidth);
  label.classList.toggle('lu-rotated', rotated);
}

/** @internal */
function toggleToolbarIcons(node: HTMLElement, col: Column, defaultVisibleClientWidth = 22.5) {
  toggleRotatedHeader(node, col, defaultVisibleClientWidth);
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
        return (column.push(col) !== null);
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
