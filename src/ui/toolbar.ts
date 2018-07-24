import {getAllToolbarActions, isSupportType, getAllToolbarDialogAddons, isSortingAscByDefault} from '../model/annotations';
import Column from '../model/Column';
import CompositeColumn, {IMultiLevelColumn} from '../model/CompositeColumn';
import ADialog, {IDialogContext} from '../ui/dialogs/ADialog';
import ChangeRendererDialog from '../ui/dialogs/ChangeRendererDialog';
import MoreColumnOptionsDialog from '../ui/dialogs/MoreColumnOptionsDialog';
import RenameDialog from '../ui/dialogs/RenameDialog';
import BooleanFilterDialog from './dialogs/BooleanFilterDialog';
import CategoricalFilterDialog from './dialogs/CategoricalFilterDialog';
import CategoricalMappingFilterDialog from './dialogs/CategoricalMappingFilterDialog';
import CompositeChildrenDialog from './dialogs/CompositeChildrenDialog';
import CutOffHierarchyDialog from './dialogs/CutOffHierarchyDialog';
import EditPatternDialog from './dialogs/EditPatternDialog';
import MappingsFilterDialog from './dialogs/MappingsFilterDialog';
import ReduceDialog from './dialogs/ReduceDialog';
import ScriptEditDialog from './dialogs/ScriptEditDialog';
import SearchDialog from './dialogs/SearchDialog';
import StringFilterDialog from './dialogs/StringFilterDialog';
import WeightsEditDialog from './dialogs/WeightsEditDialog';
import GroupDialog from './dialogs/GroupDialog';
import {sortMethods} from './dialogs/utils';
import {IRankingHeaderContext} from './interfaces';
import SortDialog from './dialogs/SortDialog';
import {EAdvancedSortMethod, ESortMethod} from '../model/INumberColumn';
import {EDateSort} from '../model/DatesColumn';
import appendNumber from './dialogs/groupNumber';

export interface IUIOptions {
  shortcut: boolean|'only';
  order: number;
}

export interface IMouseEvent {
  stopPropagation(): void;
  currentTarget: Element;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  [key: string]: any;
}

export interface IOnClickHandler {
  (col: Column, evt: IMouseEvent, ctx: IRankingHeaderContext, level: number, viaShortcut: boolean): any;
}

export interface IToolbarAction {
  title: string;

  onClick: IOnClickHandler;

  options: Partial<IUIOptions>;
}

export interface IToolbarDialogAddon {
  title: string;

  order: number;

  append(col: Column, node: HTMLElement, dialog: IDialogContext, ctx: IRankingHeaderContext): void;
}

export interface IDialogClass {
  new(col: any, dialog: IDialogContext, ...args: any[]): ADialog;
}

function ui(title: string, onClick: IOnClickHandler, options: Partial<IUIOptions> = {}): IToolbarAction {
  return { title, onClick, options };
}

export function dialogContext(ctx: IRankingHeaderContext, level: number, evt: { currentTarget: Element }): IDialogContext {
  return {
    attachment: <HTMLElement>evt.currentTarget,
    level,
    manager: ctx.dialogManager,
    idPrefix: ctx.idPrefix
  };
}

function uiDialog(title: string, dialogClass: IDialogClass, extraArgs: ((ctx: IRankingHeaderContext) => any[]) = () => [], options: Partial<IUIOptions> = {}): IToolbarAction {
  return {
    title,
    onClick: (col, evt, ctx, level) => {
      const dialog = new dialogClass(col, dialogContext(ctx, level, evt), ...extraArgs(ctx));
      dialog.open();
    }, options
  };
}

function uiSortMethod(methods: string[]): IToolbarDialogAddon {
  methods = methods.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  return {
    title: 'Sort By',
    order: 2,
    append(col, node, dialog) {
      sortMethods(node, <any>col, methods, dialog.idPrefix);
    }
  };
}

const sort: IToolbarAction = {
  title: 'Sort',
  onClick: (col, evt, ctx, level) => {
    ctx.dialogManager.removeAboveLevel(level);
    if (!evt.ctrlKey) {
      col.toggleMySorting();
      return;
    }
    const ranking = col.findMyRanker()!;
    const current = ranking.getSortCriteria();
    const order = col.isSortedByMe();

    const isAscByDefault = isSortingAscByDefault(col);

    if (order.priority === undefined) {
      ranking.sortBy(col, isAscByDefault, current.length);
      return;
    }
    let next: string|undefined = undefined;
    if (isAscByDefault) {
      next = order.asc ? 'desc' : undefined;
    } else {
      next = !order.asc ? 'asc' : undefined;
    }
    ranking.sortBy(col, next === 'asc', next ? order.priority : -1);
  },
  options: {
    shortcut: 'only',
    order: 1
  }
};

const sortBy: IToolbarAction = {
  title: 'Sort By &hellip;',
  onClick: (col, evt, ctx, level) => {
    const dialog = new SortDialog(col, false, dialogContext(ctx, level, evt), ctx);
    dialog.open();
  },
  options: {
    shortcut: false,
    order: 1
  }
};

const sortGroupBy: IToolbarAction = {
  title: 'Sort Group By &hellip;',
  onClick: (col, evt, ctx, level) => {
    const dialog = new SortDialog(col, true, dialogContext(ctx, level, evt), ctx);
    dialog.open();
  },
  options: {
    shortcut: false,
    order: 3
  }
};

const rename: IToolbarAction = {
  title: 'Rename + Color &hellip;',
  onClick: (col, evt, ctx, level) => {
    const dialog = new RenameDialog(col, dialogContext(ctx, level, evt));
    dialog.open();
  },
  options: {
    order: 4
  }
};

const vis: IToolbarAction = {
  title: 'Visualization &hellip;',
  onClick: (col, evt, ctx, level) => {
    const dialog = new ChangeRendererDialog(col, dialogContext(ctx, level, evt), ctx);
    dialog.open();
  },
  options: {}
};

const clone: IToolbarAction = {
  title: 'Clone',
  onClick: (col, _evt, ctx) => {
    ctx.dialogManager.removeAll(); // since the column will be removed
    ctx.provider.takeSnapshot(col);
  },
  options: {
    order: 80
  }
};

const more: IToolbarAction = {
  title: 'More &hellip;',
  onClick: (col, evt, ctx, level) => {
    const dialog = new MoreColumnOptionsDialog(col, dialogContext(ctx, level, evt), ctx);
    dialog.open();
  },
  options: {
    shortcut: true,
    order: 100
  }
};

const remove: IToolbarAction = {
  title: 'Remove',
  onClick: (col, _evt, ctx) => {
    ctx.dialogManager.removeAll(); // since the column will be removed
    const ranking = col.findMyRanker()!;
    const last = ranking.children.every((d) => isSupportType(d) || d.fixed || d === col);
    if (!last) {
      col.removeMe();
      return;
    }
    ctx.provider.removeRanking(ranking);
    ctx.provider.ensureOneRanking();
  },
  options: {
    order: 90
  }
};

const group = ui('Group', (col, evt, ctx, level) => {
  ctx.dialogManager.removeAboveLevel(level);

  if (!evt.ctrlKey) {
    col.groupByMe();
    return;
  }
  const ranking = col.findMyRanker()!;
  const current = ranking.getGroupCriteria();
  const order = current.indexOf(col);

  ranking.groupBy(col, order >= 0 ? -1 : current.length);
}, { shortcut: 'only', order: 2 });

const groupBy = ui('Group By &hellip;', (col, evt, ctx, level) => {
  const dialog = new GroupDialog(col, dialogContext(ctx, level, evt), ctx);
  dialog.open();
}, { shortcut: false, order: 2 });


const collapse = ui('Compress', (col, evt, ctx, level) => {
  ctx.dialogManager.removeAboveLevel(level);
  const mcol = <IMultiLevelColumn>col;
  mcol.setCollapsed(!mcol.getCollapsed());
  const i = <HTMLElement>evt.currentTarget;
  i.title = mcol.getCollapsed() ? 'Expand' : 'Compress';
});

const toolbarAddons: { [key: string]: IToolbarDialogAddon } = {
  sortNumber: uiSortMethod(Object.keys(EAdvancedSortMethod)),
  sortNumbers: uiSortMethod(Object.keys(EAdvancedSortMethod)),
  sortBoxPlot: uiSortMethod(Object.keys(ESortMethod)),
  sortDates: uiSortMethod(Object.keys(EDateSort)),
  sortGroup: uiSortMethod(['count', 'name']),
  groupNumber: <IToolbarDialogAddon>{
    title: 'Split',
    order: 2,
    append: appendNumber
  }
};

export const toolbarActions: { [key: string]: IToolbarAction | IToolbarDialogAddon } = Object.assign({
  group,
  groupBy,
  collapse,
  sort,
  sortBy,
  sortGroupBy,
  more,
  clone,
  remove,
  rename,
  search: uiDialog('Search &hellip;', SearchDialog, (ctx) => [ctx.provider], { shortcut: true, order: 3 }),
  filterMapped: uiDialog('Filter &hellip;', MappingsFilterDialog, (ctx) => [ctx], { shortcut: true }),
  filterString: uiDialog('Filter &hellip;', StringFilterDialog, () => [], { shortcut: true }),
  filterCategorical: uiDialog('Filter &hellip;', CategoricalFilterDialog, () => [], { shortcut: true }),
  filterOrdinal: uiDialog('Filter &hellip;', CategoricalMappingFilterDialog, () => [], { shortcut: true }),
  filterBoolean: uiDialog('Filter &hellip;', BooleanFilterDialog, () => [], { shortcut: true }),
  script: uiDialog('Edit Combine Script &hellip;', ScriptEditDialog, () => [], { shortcut: true }),
  reduce: uiDialog('Reduce by &hellip;', ReduceDialog),
  cutoff: uiDialog('Set Cut Off &hellip;', CutOffHierarchyDialog, (ctx) => [ctx.idPrefix]),
  editPattern: uiDialog('Edit Pattern &hellip;', EditPatternDialog, (ctx) => [ctx.idPrefix]),
  editWeights: uiDialog('Edit Weights &hellip;', WeightsEditDialog, () => [], { shortcut: true }),
  compositeContained: uiDialog('Contained Columns &hellip;', CompositeChildrenDialog, (ctx) => [ctx]),
  splitCombined: ui('Split Combined Column', (col, _evt, ctx, level) => {
    ctx.dialogManager.removeAboveLevel(level);
    // split the combined column into its children
    (<CompositeColumn>col).children.reverse().forEach((c) => col.insertAfterMe(c));
    col.removeMe();
  })
}, toolbarAddons);

const cache = new Map<string, IToolbarAction[]>();
const cacheAddon = new Map<string, IToolbarDialogAddon[]>();

export default function getToolbar(col: Column, ctx: IRankingHeaderContext) {
  if (cache.has(col.desc.type)) {
    return cache.get(col.desc.type)!;
  }
  const icons = <{ [key: string]: IToolbarAction }>ctx.toolbar;
  const actions = new Set<IToolbarAction>();
  if (!col.fixed) {
    actions.add(remove);
  }
  {
    const possible = ctx.getPossibleRenderer(col);
    if (possible.item.length > 2 || possible.group.length > 2 || possible.summary.length > 2) { // default always possible
      actions.add(vis);
    }
  }

  if (!isSupportType(col)) {
    actions.add(sort);
    actions.add(sortBy);
    actions.add(rename);
    actions.add(clone);
  }

  const keys = getAllToolbarActions(col);

  keys.forEach((key) => {
    if (icons.hasOwnProperty(key)) {
      actions.add(icons[key]);
    } else {
      console.warn('cannot find: ', col.desc.type, key);
    }
  });

  if (actions.size > 0) {
    actions.add(more);
  }

  const r = Array.from(actions).sort((a, b) => {
    if (a.options.order === b.options.order) {
      return a.title.localeCompare(b.title);
    }
    return (a.options.order || 50) - (b.options.order || 50);
  });
  cache.set(col.desc.type, r);
  return r;
}

export function getToolbarDialogAddons(col: Column, key: string, ctx: IRankingHeaderContext) {
  const cacheKey = `${col.desc.type}@${key}`;
  if (cacheAddon.has(cacheKey)) {
    return cacheAddon.get(cacheKey)!;
  }
  const icons = <{ [key: string]: IToolbarDialogAddon }>ctx.toolbar;
  const actions = new Set<IToolbarDialogAddon>();

  const keys = getAllToolbarDialogAddons(col, key);

  keys.forEach((key) => {
    if (icons.hasOwnProperty(key)) {
      actions.add(icons[key]);
    } else {
      console.warn('cannot find: ', col.desc.type, key);
    }
  });

  const r = Array.from(actions).sort((a, b) => {
    if (a.order === b.order) {
      return a.title.localeCompare(b.title);
    }
    return (a.order || 50) - (b.order || 50);
  });
  cacheAddon.set(cacheKey, r);
  return r;
}

export function isSortAble(col: Column, ctx: IRankingHeaderContext) {
  const toolbar = getToolbar(col, ctx);
  return toolbar.includes(sortBy);
}

export function isGroupAble(col: Column, ctx: IRankingHeaderContext) {
  const toolbar = getToolbar(col, ctx);
  return toolbar.includes(groupBy);
}
