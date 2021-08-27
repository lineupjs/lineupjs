import { MIN_LABEL_WIDTH } from '../constants';
import { equalArrays, dragAble, dropAble, hasDnDType, IDropResult } from '../internal';
import { categoryOf } from '../model';
import {
  createNestedDesc,
  createReduceDesc,
  createStackDesc,
  IColumnDesc,
  isArrayColumn,
  isBoxPlotColumn,
  isCategoricalColumn,
  isMapColumn,
  isNumberColumn,
  isNumbersColumn,
  Column,
  ImpositionCompositeColumn,
  ImpositionCompositesColumn,
  createImpositionDesc,
  createImpositionsDesc,
  ImpositionBoxPlotColumn,
  createImpositionBoxPlotDesc,
  CompositeColumn,
  IMultiLevelColumn,
  isMultiLevelColumn,
} from '../model';
import { aria, cssClass, engineCssClass, RESIZE_ANIMATION_DURATION, RESIZE_SPACE } from '../styles';
import MoreColumnOptionsDialog from './dialogs/MoreColumnOptionsDialog';
import type { IRankingHeaderContext, IOnClickHandler } from './interfaces';
import { getToolbar } from './toolbarResolvers';
import { dialogContext } from './dialogs';
import { addIconDOM, actionCSSClass, isActionMode, updateIconState } from './headerTooltip';

export { createToolbarMenuItems, actionCSSClass } from './headerTooltip';

function setTextOrEmpty(node: HTMLElement, condition: boolean, text: string) {
  if (condition) {
    node.innerHTML = '&nbsp;';
  } else {
    node.textContent = text;
  }
  return node;
}

/** @internal */
export interface IHeaderOptions {
  dragAble: boolean;
  mergeDropAble: boolean;
  rearrangeAble: boolean;
  resizeable: boolean;
  level: number;
  extraPrefix: string;
}

/** @internal */
export function createHeader(col: Column, ctx: IRankingHeaderContext, options: Partial<IHeaderOptions> = {}) {
  options = Object.assign(
    {
      dragAble: true,
      mergeDropAble: true,
      rearrangeAble: true,
      resizeable: true,
      level: 0,
      extraPrefix: '',
    },
    options
  );
  const node = ctx.document.createElement('section');

  const extra = options.extraPrefix
    ? (name: string) => `${cssClass(name)} ${cssClass(`${options.extraPrefix}-${name}`)}`
    : cssClass;
  const summary = col.getMetaData().summary;
  node.innerHTML = `
    <div class="${extra('label')} ${cssClass('typed-icon')}"></div>
    <div class="${extra('sublabel')}"></div>
    <div class="${extra('toolbar')}"></div>
    <div class="${extra('spacing')}"></div>
    <div class="${extra('handle')} ${cssClass('feature-advanced')} ${cssClass('feature-ui')}"></div>
  `;
  setTextOrEmpty(node.firstElementChild as HTMLElement, col.getWidth() < MIN_LABEL_WIDTH, col.label);
  setTextOrEmpty(node.children[1] as HTMLElement, col.getWidth() < MIN_LABEL_WIDTH || !summary, summary);

  // addTooltip(node, col);

  createShortcutMenuItems(
    node.getElementsByClassName(cssClass('toolbar'))[0]! as HTMLElement,
    options.level!,
    col,
    ctx,
    'header'
  );

  toggleToolbarIcons(node, col);

  if (options.dragAble) {
    dragAbleColumn(node, col, ctx);
  }
  if (options.mergeDropAble) {
    mergeDropAble(node, col, ctx);
  }
  if (options.rearrangeAble) {
    rearrangeDropAble(node.getElementsByClassName(cssClass('handle'))[0]! as HTMLElement, col, ctx);
  }
  if (options.resizeable) {
    dragWidth(col, node);
  }
  return node;
}

/** @internal */
export function updateHeader(node: HTMLElement, col: Column, minWidth = MIN_LABEL_WIDTH) {
  const label = node.getElementsByClassName(cssClass('label'))[0]! as HTMLElement;
  setTextOrEmpty(label, col.getWidth() < minWidth, col.label);
  const summary = col.getMetaData().summary;
  const subLabel = node.getElementsByClassName(cssClass('sublabel'))[0] as HTMLElement;
  if (subLabel) {
    setTextOrEmpty(subLabel, col.getWidth() < minWidth || !summary, summary);
  }

  let title = col.label;
  if (summary) {
    title = `${title}\n${summary}`;
  }
  if (col.description) {
    title = `${title}\n${col.description}`;
  }
  node.title = title;
  node.dataset.colId = col.id;
  node.dataset.type = col.desc.type;
  label.dataset.typeCat = categoryOf(col).name;

  updateIconState(node, col);

  updateMoreDialogIcons(node, col);
}

function updateMoreDialogIcons(node: HTMLElement, col: Column) {
  const root = node.closest(`.${cssClass()}`);
  if (!root) {
    return;
  }
  const dialog = root.querySelector<HTMLElement>(`.${cssClass('more-options')}[data-col-id="${col.id}"]`);
  if (!dialog) {
    return;
  }
  updateIconState(dialog, col);
}

/** @internal */
export interface IAddIcon {
  (title: string, onClick: IOnClickHandler): void;
}

/** @internal */
export function createShortcutMenuItems(
  node: HTMLElement,
  level: number,
  col: Column,
  ctx: IRankingHeaderContext,
  mode: 'header' | 'sidePanel',
  willAutoHide = true
) {
  const addIcon = addIconDOM(node, col, ctx, level, false, mode);
  const toolbar = getToolbar(col, ctx);
  const shortcuts = toolbar.filter((d) => !isActionMode(col, d, mode, 'menu'));
  const hybrids = shortcuts.reduce((a, b) => a + (isActionMode(col, b, mode, 'menu+shortcut') ? 1 : 0), 0);

  shortcuts.forEach(addIcon);
  const moreEntries = toolbar.length - shortcuts.length + hybrids;

  if (shortcuts.length === toolbar.length || (moreEntries === hybrids && !willAutoHide)) {
    // all visible or just hybrids that will always be visible
    return;
  }

  // need a more entry
  node.insertAdjacentHTML(
    'beforeend',
    `<i data-a="m" data-m="${moreEntries}" title="More …" class="${actionCSSClass('More')}">${aria('More …')}</i>`
  );
  const i = node.lastElementChild as HTMLElement;
  i.onclick = (evt) => {
    evt.stopPropagation();
    ctx.dialogManager.setHighlightColumn(col);
    const dialog = new MoreColumnOptionsDialog(col, dialogContext(ctx, level, evt), mode, ctx);
    dialog.open();
  };
}

/** @internal */
function toggleRotatedHeader(node: HTMLElement, col: Column, defaultVisibleClientWidth: number) {
  // rotate header flag if needed
  const label = node.getElementsByClassName(cssClass('label'))[0] as HTMLElement;
  if (col.getWidth() < MIN_LABEL_WIDTH) {
    label.classList.remove(`.${cssClass('rotated')}`);
    return;
  }
  const width = label.clientWidth;
  const rotated =
    width <= 0
      ? ((col.label.length * defaultVisibleClientWidth) / 3) * 0.6 > col.getWidth()
      : label.scrollWidth * 0.6 > label.clientWidth;
  label.classList.toggle(`.${cssClass('rotated')}`, rotated);
}

/** @internal */
function toggleToolbarIcons(node: HTMLElement, col: Column, defaultVisibleClientWidth = 22.5) {
  toggleRotatedHeader(node, col, defaultVisibleClientWidth);

  const toolbar = node.getElementsByClassName(cssClass('toolbar'))[0] as HTMLElement;
  if (toolbar.childElementCount === 0) {
    return;
  }
  const availableWidth = col.getWidth();
  const actions = Array.from(toolbar.children).map((d) => ({
    node: d as HTMLElement,
    width: d.clientWidth > 0 ? d.clientWidth : defaultVisibleClientWidth,
  }));

  const shortCuts = actions.filter((d) => d.node.dataset.a === 'o');
  const hybrids = actions.filter((d) => d.node.dataset.a === 's');
  const moreIcon = actions.find((d) => d.node.dataset.a === 'm');
  const moreEntries = moreIcon ? Number.parseInt(moreIcon.node.dataset.m!, 10) : 0;
  const needMore = moreEntries > hybrids.length;

  let total = actions.reduce((a, b) => a + b.width, 0);

  for (const action of actions) {
    // maybe hide not needed "more"
    action.node.classList.remove(cssClass('hidden'));
  }

  // all visible
  if (total < availableWidth) {
    return;
  }
  if (moreIcon && !needMore && total - moreIcon.width < availableWidth) {
    // available space is enough we can skip the "more" and then it fits
    moreIcon.node.classList.add(cssClass('hidden'));
    return;
  }

  for (const action of hybrids.reverse().concat(shortCuts.reverse())) {
    // back to forth and hybrids earlier than pure shortcuts
    // hide and check if enough
    action.node.classList.add(cssClass('hidden'));
    total -= action.width;
    if (total < availableWidth) {
      return;
    }
  }
}

/**
 * allow to change the width of a column using dragging the handle
 * @internal
 */
export function dragWidth(col: Column, node: HTMLElement) {
  let ueberElement: HTMLElement;
  let sizeHelper: HTMLElement;
  let currentFooterTransformation = '';
  const handle = node.getElementsByClassName(cssClass('handle'))[0] as HTMLElement;

  let start = 0;
  let originalWidth = 0;
  const mouseMove = (evt: MouseEvent) => {
    evt.stopPropagation();
    evt.preventDefault();
    const end = evt.clientX;
    const delta = end - start;

    if (Math.abs(start - end) < 2) {
      //ignore
      return;
    }
    start = end;
    const width = Math.max(0, col.getWidth() + delta);

    sizeHelper.classList.toggle(cssClass('resize-animated'), width < originalWidth);
    // no idea why shifted by the size compared to the other footer element
    sizeHelper.style.transform = `${currentFooterTransformation} translate(${
      width - originalWidth - RESIZE_SPACE
    }px, 0px)`;

    node.style.width = `${width}px`;
    col.setWidth(width);
    toggleToolbarIcons(node, col);
  };

  const mouseUp = (evt: MouseEvent) => {
    evt.stopPropagation();
    evt.preventDefault();
    const end = evt.clientX;
    node.classList.remove(cssClass('change-width'));

    ueberElement.removeEventListener('mousemove', mouseMove);
    ueberElement.removeEventListener('mouseup', mouseUp);
    ueberElement.removeEventListener('mouseleave', mouseUp);
    ueberElement.classList.remove(cssClass('resizing'));
    node.style.width = null;
    setTimeout(() => {
      sizeHelper.classList.remove(cssClass('resizing'), cssClass('resize-animated'));
    }, RESIZE_ANIMATION_DURATION * 1.2); // after animation ended

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
    node.classList.add(cssClass('change-width'));

    originalWidth = col.getWidth();
    start = evt.clientX;
    ueberElement = node.closest<HTMLElement>('body') || node.closest<HTMLElement>(`.${cssClass()}`)!; // take the whole body or root lineup
    ueberElement.addEventListener('mousemove', mouseMove);
    ueberElement.addEventListener('mouseup', mouseUp);
    ueberElement.addEventListener('mouseleave', mouseUp);
    ueberElement.classList.add(cssClass('resizing'));

    sizeHelper = node
      .closest<HTMLElement>(`.${engineCssClass()}`)!
      .querySelector<HTMLElement>(`.${cssClass('resize-helper')}`);
    currentFooterTransformation = (sizeHelper.previousElementSibling! as HTMLElement).style.transform!;
    sizeHelper.style.transform = `${currentFooterTransformation} translate(${-RESIZE_SPACE}px, 0px)`;
    sizeHelper.classList.add(cssClass('resizing'));
  };
  handle.onclick = (evt) => {
    // avoid resorting
    evt.stopPropagation();
    evt.preventDefault();
  };
}

/** @internal */
export const MIMETYPE_PREFIX = 'text/x-caleydo-lineup-column';

/**
 * allow to drag the column away
 * @internal
 */
export function dragAbleColumn(node: HTMLElement, column: Column, ctx: IRankingHeaderContext) {
  dragAble(
    node,
    () => {
      const ref = JSON.stringify(ctx.provider.toDescRef(column.desc));
      const data: any = {
        'text/plain': column.label,
        [`${MIMETYPE_PREFIX}-ref`]: column.id,
        [MIMETYPE_PREFIX]: ref,
      };
      if (isNumberColumn(column)) {
        data[`${MIMETYPE_PREFIX}-number`] = ref;
        data[`${MIMETYPE_PREFIX}-number-ref`] = column.id;
      }
      if (isCategoricalColumn(column)) {
        data[`${MIMETYPE_PREFIX}-categorical`] = ref;
        data[`${MIMETYPE_PREFIX}-categorical-ref`] = column.id;
      }
      if (isBoxPlotColumn(column)) {
        data[`${MIMETYPE_PREFIX}-boxplot`] = ref;
        data[`${MIMETYPE_PREFIX}-boxplot-ref`] = column.id;
      }
      if (isMapColumn(column)) {
        data[`${MIMETYPE_PREFIX}-map`] = ref;
        data[`${MIMETYPE_PREFIX}-map-ref`] = column.id;
      }
      if (isArrayColumn(column)) {
        data[`${MIMETYPE_PREFIX}-array`] = ref;
        data[`${MIMETYPE_PREFIX}-array-ref`] = column.id;
      }
      if (isNumbersColumn(column)) {
        data[`${MIMETYPE_PREFIX}-numbers`] = ref;
        data[`${MIMETYPE_PREFIX}-numbers-ref`] = column.id;
      }
      return {
        effectAllowed: 'copyMove',
        data,
      };
    },
    true
  );
}

/**
 * dropper for allowing to rearrange (move, copy) columns
 * @internal
 */
export function rearrangeDropAble(node: HTMLElement, column: Column, ctx: IRankingHeaderContext) {
  dropAble(
    node,
    [`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX],
    (result) => {
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
      if (!toInsertParent) {
        // no parent will always be a move
        return column.insertAfterMe(col) != null;
      }
      if (toInsertParent === column.parent) {
        // move operation
        return toInsertParent.moveAfter(col, column) != null;
      }
      col.removeMe();
      return column.insertAfterMe(col) != null;
    },
    null,
    true
  );
}

/**
 * dropper for allowing to change the order by dropping it at a certain position
 * @internal
 */
export function resortDropAble(
  node: HTMLElement,
  column: Column,
  ctx: IRankingHeaderContext,
  where: 'before' | 'after',
  autoGroup: boolean
) {
  dropAble(
    node,
    [`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX],
    (result) => {
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

      const criteria = ranking.getSortCriteria();
      const groups = ranking.getGroupCriteria();

      const removeFromSort = (col: Column) => {
        const existing = criteria.findIndex((d) => d.col === col);
        if (existing >= 0) {
          // remove existing column but keep asc state
          return criteria.splice(existing, 1)[0].asc;
        }
        return false;
      };

      // remove the one to add
      const asc = removeFromSort(col);

      const groupIndex = groups.indexOf(column);
      const index = criteria.findIndex((d) => d.col === column);

      if (autoGroup && groupIndex >= 0) {
        // before the grouping, so either un group or regroup
        removeFromSort(column);
        if (isCategoricalColumn(col)) {
          // we can group by it
          groups.splice(groupIndex + (where === 'after' ? 1 : 0), 0, col);
        } else {
          // remove all before and shift to sorting + sorting
          const removed = groups.splice(0, groups.length - groupIndex);
          criteria.unshift(...removed.reverse().map((d) => ({ asc: false, col: d }))); // now a first sorting criteria
          criteria.unshift({ asc, col });
        }
      } else if (index < 0) {
        criteria.push({ asc, col });
      } else if (index === 0 && autoGroup && isCategoricalColumn(col)) {
        // make group criteria
        groups.push(col);
      } else {
        criteria.splice(index + (where === 'after' ? 1 : 0), 0, { asc, col });
      }

      if (!equalArrays(groups, ranking.getGroupCriteria())) {
        ranking.setGroupCriteria(groups);
      }
      ranking.setSortCriteria(criteria);
      return true;
    },
    null,
    true
  );
}

/**
 * dropper for merging columns
 * @internal
 */
export function mergeDropAble(node: HTMLElement, column: Column, ctx: IRankingHeaderContext) {
  const resolveDrop = (result: IDropResult) => {
    const data = result.data;
    const copy = result.effect === 'copy';
    const prefix = MIMETYPE_PREFIX;
    const key = Object.keys(data).find((d) => d.startsWith(prefix) && d.endsWith('-ref'));
    if (key) {
      const id = data[key];
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
    const alternative = Object.keys(data).find((d) => d.startsWith(prefix));
    if (!alternative) {
      return null;
    }
    const desc = JSON.parse(alternative);
    return ctx.provider.create(ctx.provider.fromDescRef(desc))!;
  };

  const pushChild = (result: IDropResult) => {
    const col: Column | null = resolveDrop(result);
    return col != null && (column as CompositeColumn).push(col) != null;
  };

  const mergeImpl = (col: Column | null, desc: IColumnDesc) => {
    if (col == null) {
      return false;
    }
    const ranking = column.findMyRanker()!;
    const index = ranking.indexOf(column);
    const parent = ctx.provider.create(desc) as CompositeColumn;
    column.removeMe();
    parent.push(column);
    parent.push(col);
    return ranking.insert(parent, index) != null;
  };

  const mergeWith = (desc: IColumnDesc) => (result: IDropResult) => {
    const col: Column | null = resolveDrop(result);
    return mergeImpl(col, desc);
  };

  const all = [`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX];
  const numberish = [`${MIMETYPE_PREFIX}-number-ref`, `${MIMETYPE_PREFIX}-number`];
  const categorical = [`${MIMETYPE_PREFIX}-categorical-ref`, `${MIMETYPE_PREFIX}-categorical`];
  const boxplot = [`${MIMETYPE_PREFIX}-boxplot-ref`, `${MIMETYPE_PREFIX}-boxplot`];
  const numbers = [`${MIMETYPE_PREFIX}-numbers-ref`, `${MIMETYPE_PREFIX}-numbers`];

  node.dataset.draginfo = '+';
  if (column instanceof ImpositionCompositeColumn) {
    return dropAble(
      node,
      categorical.concat(numberish),
      pushChild,
      (e) => {
        if (hasDnDType(e, ...categorical)) {
          node.dataset.draginfo = 'Color by';
          return;
        }
        if (hasDnDType(e, ...numberish)) {
          node.dataset.draginfo = 'Wrap';
        }
      },
      false,
      () => column.children.length < 2
    );
  }
  if (column instanceof ImpositionBoxPlotColumn) {
    return dropAble(
      node,
      categorical.concat(boxplot),
      pushChild,
      (e) => {
        if (hasDnDType(e, ...categorical)) {
          node.dataset.draginfo = 'Color by';
          return;
        }
        if (hasDnDType(e, ...boxplot)) {
          node.dataset.draginfo = 'Wrap';
        }
      },
      false,
      () => column.children.length < 2
    );
  }
  if (column instanceof ImpositionCompositesColumn) {
    return dropAble(
      node,
      categorical.concat(numbers),
      pushChild,
      (e) => {
        if (hasDnDType(e, ...categorical)) {
          node.dataset.draginfo = 'Color by';
          return;
        }
        if (hasDnDType(e, ...numbers)) {
          node.dataset.draginfo = 'Wrap';
        }
      },
      false,
      () => column.children.length < 2
    );
  }
  if (isMultiLevelColumn(column)) {
    // stack column or nested
    return dropAble(node, (column as IMultiLevelColumn).canJustAddNumbers ? numberish : all, pushChild);
  }
  if (column instanceof CompositeColumn) {
    return dropAble(node, (column as CompositeColumn).canJustAddNumbers ? numberish : all, pushChild);
  }
  if (isNumbersColumn(column)) {
    node.dataset.draginfo = 'Color by';
    return dropAble(node, categorical, mergeWith(createImpositionsDesc()));
  }
  if (isBoxPlotColumn(column)) {
    node.dataset.draginfo = 'Color by';
    return dropAble(node, categorical, mergeWith(createImpositionBoxPlotDesc()));
  }
  if (isNumberColumn(column)) {
    node.dataset.draginfo = 'Merge';
    return dropAble(
      node,
      categorical.concat(numberish),
      (result: IDropResult, evt: DragEvent) => {
        const col: Column | null = resolveDrop(result);
        if (col == null) {
          return false;
        }
        if (isCategoricalColumn(col)) {
          return mergeImpl(col, createImpositionDesc());
        }
        if (isNumberColumn(col)) {
          return mergeImpl(col, evt.shiftKey ? createReduceDesc() : createStackDesc());
        }
        return false;
      },
      (e) => {
        if (hasDnDType(e, ...categorical)) {
          node.dataset.draginfo = 'Color by';
          return;
        }
        if (hasDnDType(e, ...numberish)) {
          node.dataset.draginfo = e.shiftKey ? 'Min/Max' : 'Sum';
        }
      }
    );
  }
  node.dataset.draginfo = 'Group';
  return dropAble(node, all, mergeWith(createNestedDesc()));
}
