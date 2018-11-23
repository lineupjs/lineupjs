import {getAllToolbarActions, isSupportType, getAllToolbarDialogAddons, isSortingAscByDefault} from '../model/annotations';
import Column from '../model/Column';
import CompositeColumn, {IMultiLevelColumn} from '../model/CompositeColumn';
import ADialog, {IDialogContext} from './dialogs/ADialog';
import ChangeRendererDialog from './dialogs/ChangeRendererDialog';
import RenameDialog from './dialogs/RenameDialog';
import BooleanFilterDialog from './dialogs/BooleanFilterDialog';
import CategoricalFilterDialog from './dialogs/CategoricalFilterDialog';
import CategoricalMappingFilterDialog from './dialogs/CategoricalMappingFilterDialog';
import CompositeChildrenDialog from './dialogs/CompositeChildrenDialog';
import CutOffHierarchyDialog from './dialogs/CutOffHierarchyDialog';
import EditPatternDialog from './dialogs/EditPatternDialog';
import NumberFilterDialog from './dialogs/NumberFilterDialog';
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
import appendString from './dialogs/groupString';
import appendDate from './dialogs/groupDate';
import ColorMappingDialog from './dialogs/ColorMappingDialog';
import MappingDialog from './dialogs/MappingDialog';
import DateFilterDialog from './dialogs/DateFilterDialog';
import {cssClass} from '../styles';
import CategoricalColorMappingDialog from './dialogs/CategoricalColorMappingDialog';

export interface IUIOptions {
  shortcut: boolean|'only';
  order: number;
  featureLevel: 'basic' | 'advanced';
  featureCategory: 'ranking' | 'model' | 'ui';
}

export interface IOnClickHandler {
  (col: Column, evt: MouseEvent, ctx: IRankingHeaderContext, level: number, viaShortcut: boolean): any;
}

export interface IToolbarAction {
  title: string;

  enabled?(col: Column): boolean;

  onClick: IOnClickHandler;

  options: Partial<IUIOptions>;
}

export interface IToolbarDialogAddon {
  title: string;

  order: number;

  append(col: Column, node: HTMLElement, dialog: IDialogContext, ctx: IRankingHeaderContext): void;
}

/** @internal */
export interface IDialogClass {
  new(col: any, dialog: IDialogContext, ...args: any[]): ADialog;
}

function ui(title: string, onClick: IOnClickHandler, options: Partial<IUIOptions> = {}): IToolbarAction {
  return { title, onClick, options };
}

export function dialogContext(ctx: IRankingHeaderContext, level: number, attachment: HTMLElement | MouseEvent): IDialogContext {
  return {
    attachment: (<MouseEvent>attachment).currentTarget != null ? <HTMLElement>(<MouseEvent>attachment).currentTarget : <HTMLElement>attachment,
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
  title: 'Sort', // basic ranking
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
    order: 1,
    featureCategory: 'ranking',
    featureLevel: 'basic'
  }
};

const sortBy: IToolbarAction = {
  title: 'Sort By &hellip;', // advanced ranking
  onClick: (col, evt, ctx, level) => {
    const dialog = new SortDialog(col, false, dialogContext(ctx, level, evt), ctx);
    dialog.open();
  },
  options: {
    shortcut: false,
    order: 1,
    featureCategory: 'ranking',
    featureLevel: 'advanced'
  }
};

const sortGroupBy: IToolbarAction = {
  title: 'Sort Groups By &hellip;', // advanced ranking
  onClick: (col, evt, ctx, level) => {
    const dialog = new SortDialog(col, true, dialogContext(ctx, level, evt), ctx);
    dialog.open();
  },
  options: {
    shortcut: false,
    order: 3,
    featureCategory: 'ranking',
    featureLevel: 'advanced'
  }
};

const rename: IToolbarAction = {
  title: 'Rename &hellip;', // advanced
  onClick: (col, evt, ctx, level) => {
    const dialog = new RenameDialog(col, dialogContext(ctx, level, evt));
    dialog.open();
  },
  options: {
    order: 4,
    featureCategory: 'ui',
    featureLevel: 'advanced'
  }
};

const vis: IToolbarAction = {
  title: 'Visualization &hellip;', // advanced view
  onClick: (col, evt, ctx, level) => {
    const dialog = new ChangeRendererDialog(col, dialogContext(ctx, level, evt), ctx);
    dialog.open();
  },
  options: {
    featureCategory: 'ui',
    featureLevel: 'advanced'
  }
};

const clone: IToolbarAction = {
  title: 'Clone', // advanced model
  onClick: (col, _evt, ctx) => {
    ctx.dialogManager.removeAll(); // since the column will be removed
    ctx.provider.takeSnapshot(col);
  },
  options: {
    order: 80,
    featureCategory: 'model',
    featureLevel: 'advanced'
  }
};

const remove: IToolbarAction = {
  title: 'Remove', // advanced model
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
    order: 90,
    featureCategory: 'model',
    featureLevel: 'advanced'
  }
};

// basic ranking
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
}, { shortcut: 'only', order: 2, featureCategory: 'ranking', featureLevel: 'basic' });

// advanced ranking
const groupBy = ui('Group By &hellip;', (col, evt, ctx, level) => {
  const dialog = new GroupDialog(col, dialogContext(ctx, level, evt), ctx);
  dialog.open();
}, { shortcut: false, order: 2, featureCategory: 'ranking', featureLevel: 'advanced' });

function toggleCompressExpand(col: Column, evt: MouseEvent, ctx: IRankingHeaderContext, level: number) {
  ctx.dialogManager.removeAboveLevel(level);
  const mcol = <IMultiLevelColumn>col;
  mcol.setCollapsed(!mcol.getCollapsed());

  const collapsed = mcol.getCollapsed();
  const i = <HTMLElement>evt.currentTarget;
  i.title = collapsed ? 'Expand' : 'Compress';
  i.classList.toggle(cssClass('action-compress'), !collapsed);
  i.classList.toggle(cssClass('action-expand'), collapsed);
  const inner = i.querySelector('span')!;
  if (inner) {
    inner.textContent = i.title;
  }
}

const compress = {
  title: 'Compress',
  enabled: (col: IMultiLevelColumn) => !col.getCollapsed(),
  onClick: toggleCompressExpand,
  options: { featureCategory: 'model', featureLevel: 'advanced' }
};

const expand = {
  title: 'Expand',
  enabled: (col: IMultiLevelColumn) => col.getCollapsed(),
  onClick: toggleCompressExpand,
  options: { featureCategory: 'model', featureLevel: 'advanced' }
};

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
  },
  groupString: <IToolbarDialogAddon>{
    title: 'Groups',
    order: 2,
    append: appendString
  },
  groupDate: <IToolbarDialogAddon>{
    title: 'Granularity',
    order: 2,
    append: appendDate
  },
};

export const toolbarActions: { [key: string]: IToolbarAction | IToolbarDialogAddon } = Object.assign({
  group,
  groupBy,
  compress,
  expand,
  sort,
  sortBy,
  sortGroupBy,
  clone,
  remove,
  rename,
  search: uiDialog('Search &hellip;', SearchDialog, (ctx) => [ctx.provider], { shortcut: true, order: 3, featureCategory: 'ranking', featureLevel: 'basic' }),
  filterNumber: uiDialog('Filter &hellip;', NumberFilterDialog, (ctx) => [ctx], { shortcut: true, featureCategory: 'ranking', featureLevel: 'basic' }),
  filterDate: uiDialog('Filter &hellip;', DateFilterDialog, (ctx) => [ctx], { shortcut: true, featureCategory: 'ranking', featureLevel: 'basic' }),
  filterString: uiDialog('Filter &hellip;', StringFilterDialog, () => [], { shortcut: true, featureCategory: 'ranking', featureLevel: 'basic' }),
  filterCategorical: uiDialog('Filter &hellip;', CategoricalFilterDialog, () => [], { shortcut: true, featureCategory: 'ranking', featureLevel: 'basic' }),
  filterOrdinal: uiDialog('Filter &hellip;', CategoricalMappingFilterDialog, () => [], { shortcut: true, featureCategory: 'ranking', featureLevel: 'basic' }),
  filterBoolean: uiDialog('Filter &hellip;', BooleanFilterDialog, () => [], { shortcut: true, featureCategory: 'ranking', featureLevel: 'basic' }),
  colorMapped: uiDialog('Color Mapping &hellip;', ColorMappingDialog, () => [], { shortcut: false, featureCategory: 'ui', featureLevel: 'advanced' }),
  colorMappedCategorical: uiDialog('Color Mapping &hellip;', CategoricalColorMappingDialog, () => [], { shortcut: false, featureCategory: 'ui', featureLevel: 'advanced' }),
  script: uiDialog('Edit Combine Script &hellip;', ScriptEditDialog, () => [], { shortcut: true, featureCategory: 'model', featureLevel: 'advanced' }),
  reduce: uiDialog('Reduce by &hellip;', ReduceDialog, () => [], { featureCategory: 'model', featureLevel: 'advanced' }),
  cutoff: uiDialog('Set Cut Off &hellip;', CutOffHierarchyDialog, (ctx) => [ctx.idPrefix], { featureCategory: 'model', featureLevel: 'advanced' }),
  editMapping: uiDialog('Data Mapping &hellip;', MappingDialog, (ctx) => [ctx], { featureCategory: 'model', featureLevel: 'advanced' }),
  editPattern: uiDialog('Edit Pattern &hellip;', EditPatternDialog, (ctx) => [ctx.idPrefix], { featureCategory: 'model', featureLevel: 'advanced' }),
  editWeights: uiDialog('Edit Weights &hellip;', WeightsEditDialog, () => [], { shortcut: true, featureCategory: 'model', featureLevel: 'advanced' }),
  compositeContained: uiDialog('Contained Columns &hellip;', CompositeChildrenDialog, (ctx) => [ctx], { featureCategory: 'model', featureLevel: 'advanced' }),
  splitCombined: ui('Split Combined Column', (col, _evt, ctx, level) => {
    ctx.dialogManager.removeAboveLevel(level);
    // split the combined column into its children
    (<CompositeColumn>col).children.reverse().forEach((c) => col.insertAfterMe(c));
    col.removeMe();
  }, { featureCategory: 'model', featureLevel: 'advanced' }),
  invertSelection: ui('Invert Selection', (col, _evt, ctx, level) => {
    ctx.dialogManager.removeAboveLevel(level - 1); // close itself
    const s = ctx.provider.getSelection();
    const order = col.findMyRanker()!.getOrder();
    if (s.length === 0) {
      ctx.provider.setSelection(order);
      return;
    }
    const ss = new Set(s);
    const others = order.filter((d) => !ss.has(d));
    ctx.provider.setSelection(others);
  }, { featureCategory: 'model', featureLevel: 'advanced' })
}, toolbarAddons);

function sortActions(a: IToolbarAction, b: IToolbarAction) {
  if (a.options.order === b.options.order) {
    return a.title.toString().localeCompare(b.title.toString());
  }
  return (a.options.order || 50) - (b.options.order || 50);
}

const cache = new Map<string, IToolbarAction[]>();
const cacheAddon = new Map<string, IToolbarDialogAddon[]>();

function getFullToolbar(col: Column, ctx: IRankingHeaderContext) {
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

  const r = Array.from(actions).sort(sortActions);
  cache.set(col.desc.type, r);
  return r;
}

/** @internal */
export function getToolbar(col: Column, ctx: IRankingHeaderContext) {
  const toolbar = getFullToolbar(col, ctx);
  const flags = ctx.flags;

  return toolbar.filter((a) => {
    if (a.enabled && !a.enabled(col)) {
      return false;
    }
    // level is basic or not one of disabled features
    return a.options.featureLevel === 'basic' || !((flags.advancedModelFeatures === false && a.options.featureCategory === 'model') || (flags.advancedRankingFeatures === false && a.options.featureCategory === 'ranking') || (flags.advancedUIFeatures === false && a.options.featureCategory === 'ui'));
  });
}

/** @internal */
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

/** @internal */
export function isSortAble(col: Column, ctx: IRankingHeaderContext) {
  const toolbar = getFullToolbar(col, ctx);
  return toolbar.includes(sortBy);
}

/** @internal */
export function isGroupAble(col: Column, ctx: IRankingHeaderContext) {
  const toolbar = getFullToolbar(col, ctx);
  return toolbar.includes(groupBy);
}

/** @internal */
export function isGroupSortAble(col: Column, ctx: IRankingHeaderContext) {
  const toolbar = getFullToolbar(col, ctx);
  return toolbar.includes(sortGroupBy);
}
