import {getAllToolbarActions, isSupportType} from '../model/annotations';
import Column from '../model/Column';
import {default as CompositeColumn, IMultiLevelColumn} from '../model/CompositeColumn';
import ADialog from '../ui/dialogs/ADialog';
import ChangeRendererDialog from '../ui/dialogs/ChangeRendererDialog';
import MoreColumnOptionsDialog from '../ui/dialogs/MoreColumnOptionsDialog';
import RenameDialog from '../ui/dialogs/RenameDialog';
import BooleanFilterDialog from './dialogs/BooleanFilterDialog';
import CategoricalFilterDialog from './dialogs/CategoricalFilterDialog';
import CategoricalMappingFilterDialog from './dialogs/CategoricalMappingFilterDialog';
import CompositeChildrenDialog from './dialogs/CompositeChildrenDialog';
import CutOffHierarchyDialog from './dialogs/CutOffHierarchyDialog';
import EditLinkDialog from './dialogs/EditLinkDialog';
import MappingsFilterDialog from './dialogs/MappingsFilterDialog';
import ScriptEditDialog from './dialogs/ScriptEditDialog';
import SearchDialog from './dialogs/SearchDialog';
import SortDateDialog from './dialogs/SortDateDialog';
import SortDialog from './dialogs/SortDialog';
import SortGroupDialog from './dialogs/SortGroupDialog';
import StratifyThresholdDialog from './dialogs/StratifyThresholdDialog';
import StringFilterDialog from './dialogs/StringFilterDialog';
import WeightsEditDialog from './dialogs/WeightsEditDialog';
import {IFilterDialog, IRankingHeaderContext} from './interfaces';

export interface IUIOptions {
  shortcut: boolean;
  order: number;
}

export interface IOnClickHandler {
  (col: Column, evt: { stopPropagation: () => void, currentTarget: Element, [key: string]: any }, ctx: IRankingHeaderContext): any;
}

export interface IToolbarAction {
  title: string;

  onClick: IOnClickHandler;

  options: Partial<IUIOptions>;
}

export interface IDialogClass {
  new(col: any, icon: HTMLElement, ...args: any[]): ADialog;
}

export function ui(title: string, onClick: IOnClickHandler, options: Partial<IUIOptions> = {}): IToolbarAction {
  return {title, onClick, options};
}

export function uiDialog(title: string, dialogClass: IDialogClass, extraArgs: ((ctx: IRankingHeaderContext) => any[]) = () => [], options: Partial<IUIOptions> = {}): IToolbarAction {
  return {
    title,
    onClick: (col, evt, ctx) => {
      const dialog = new dialogClass(col, <HTMLElement>evt.currentTarget, ... extraArgs(ctx));
      dialog.openDialog();
    }, options
  };
}

export function filterBy(dialogClass: IFilterDialog) {
  return uiDialog('Filter &hellip;', dialogClass, (ctx) => ['', ctx.provider, ctx.idPrefix]);
}

const sort: IToolbarAction = {
  title: 'Sort',
  onClick: (col) => {
    col.toggleMySorting();
  },
  options: {
    shortcut: true,
    order: 1
  }
};

const rename: IToolbarAction = {
  title: 'Rename + Color &hellip;',
  onClick: (col, evt) => {
    const dialog = new RenameDialog(col, <HTMLElement>evt.currentTarget);
    dialog.openDialog();
  },
  options: {
    order: 3
  }
};

const vis: IToolbarAction = {
  title: 'Visualization &hellip;',
  onClick: (col, evt, ctx) => {
    const dialog = new ChangeRendererDialog(col, <HTMLElement>evt.currentTarget, ctx);
    dialog.openDialog();
  },
  options: {}
};

const clone: IToolbarAction = {
  title: 'Clone',
  onClick: (col, _evt, ctx) => {
    ctx.provider.takeSnapshot(col);
  },
  options: {
    order: 80
  }
};

export const more: IToolbarAction = {
  title: 'More &hellip;',
  onClick: (col, evt, ctx) => {
    const dialog = new MoreColumnOptionsDialog(col, <HTMLElement>evt.currentTarget, '', ctx);
    dialog.openDialog();
  },
  options: {
    shortcut: true,
    order: 3
  }
};

const remove: IToolbarAction = {
  title: 'Remove',
  onClick: (col, _evt, ctx) => {
    if (!(col.desc.type === 'rank')) {
      col.removeMe();
      return;
    }
    ctx.provider.removeRanking(col.findMyRanker()!);
    ctx.provider.ensureOneRanking();
  },
  options: {
    order: 90
  }
};

const stratify = ui('Stratify', (col) => col.groupByMe(), { shortcut: true, order: 2});

const collapse = ui('Compress', (col, evt) => {
  const mcol = <IMultiLevelColumn>col;
  mcol.setCollapsed(!mcol.getCollapsed());
  const i = <HTMLElement>evt.currentTarget;
  i.title = mcol.getCollapsed() ? 'Expand' : 'Compress';
});

export const icons: { [key: string]: IToolbarAction } = {
  stratify,
  collapse,
  sort,
  more,
  clone,
  remove,
  rename,
  vis,
  search: uiDialog('Search &hellip;', SearchDialog, (ctx) => [ctx.provider]),
  numbersSort: uiDialog('Sort by &hellip;', SortDialog),
  datesSort: uiDialog('Sort by &hellip;', SortDateDialog),
  numbersSortGroup: uiDialog('Sort Group by &hellip;', SortDialog),
  compositeContained: uiDialog('Contained Columns &hellip;', CompositeChildrenDialog, (ctx) => [ctx]),
  splitCombined: ui('Split Combined Column', (col) => {
    // split the combined column into its children
    (<CompositeColumn>col).children.reverse().forEach((c) => col.insertAfterMe(c));
    col.removeMe();
  }),
  filterMapped: filterBy(MappingsFilterDialog),
  sortGroup: uiDialog('Sort Group by &hellip;', SortGroupDialog, () => [], {shortcut: true, order: 1}),
  cutoff: uiDialog('Set Cut Off &hellip;', CutOffHierarchyDialog, (ctx) => [ctx.idPrefix]),
  editLink: uiDialog('Edit Link Pattern &hellip;', EditLinkDialog, (ctx) => [ctx.idPrefix]),
  stratifyThreshold: uiDialog('Stratify by Threshold &hellip;', StratifyThresholdDialog, () => [], {
    shortcut: true,
    order: 2
  }),
  filterString: filterBy(StringFilterDialog),
  editWeights: uiDialog('Edit Weights &hellip;', WeightsEditDialog),
  script: uiDialog('Edit Combine Script &hellip;', ScriptEditDialog),
  filterCategorical: filterBy(CategoricalFilterDialog),
  filterOrdinal: filterBy(CategoricalMappingFilterDialog),
  filterBoolean: filterBy(BooleanFilterDialog)
};

const cache = new Map<string, IToolbarAction[]>();


export default function getToolbar(col: Column, ctx: IRankingHeaderContext) {
  if (cache.has(col.desc.type)) {
    return cache.get(col.desc.type)!;
  }
  const icons = ctx.toolbar;
  const actions = new Set<IToolbarAction>();
  actions.add(remove);
  actions.add(more);

  {
    const possible = ctx.getPossibleRenderer(col);
    if (possible.item.length > 2 || possible.group.length > 2) { // default always possible
      actions.add(vis);
    }
  }

  if (!isSupportType(col)) {
    actions.add(sort);
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

  const r = Array.from(actions).sort((a, b) => {
    if (a.options.order === b.options.order) {
      return a.title.localeCompare(b.title);
    }
    return (a.options.order || 50) - (b.options.order || 50);
  });
  cache.set(col.desc.type, r);
  return r;
}
