import type { Column } from '../model';
import { getAllToolbarActions, getAllToolbarDialogAddons } from '../model/internal';
import type { IRankingHeaderContext, IToolbarAction } from './interfaces';

function sortActions(a: IToolbarAction, b: IToolbarAction) {
  if (a.options.order === b.options.order) {
    return a.title.toString().localeCompare(b.title.toString());
  }
  return (a.options.order || 50) - (b.options.order || 50);
}

function getFullToolbar(col: Column, ctx: IRankingHeaderContext) {
  const cache = ctx.caches.toolbar;
  if (cache.has(col.desc.type)) {
    return cache.get(col.desc.type)!;
  }

  const keys = getAllToolbarActions(col);

  if (!col.fixed) {
    keys.push('remove');
  }
  {
    const possible = ctx.getPossibleRenderer(col);
    if (possible.item.length > 2 || possible.group.length > 2 || possible.summary.length > 2) {
      // default always possible
      keys.push('vis');
    }
  }

  const actions = ctx.resolveToolbarActions(col, keys);

  const r = Array.from(new Set(actions)).sort(sortActions);
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
    return (
      a.options.featureLevel === 'basic' ||
      !(
        (flags.advancedModelFeatures === false && a.options.featureCategory === 'model') ||
        (flags.advancedRankingFeatures === false && a.options.featureCategory === 'ranking') ||
        (flags.advancedUIFeatures === false && a.options.featureCategory === 'ui')
      )
    );
  });
}

/** @internal */
export function isSortAble(col: Column, ctx: IRankingHeaderContext) {
  const toolbar = getFullToolbar(col, ctx);
  return toolbar.find((d) => d.title === 'Sort' || d.title.startsWith('Sort By')) != null;
}

/** @internal */
export function isGroupAble(col: Column, ctx: IRankingHeaderContext) {
  const toolbar = getFullToolbar(col, ctx);
  return toolbar.find((d) => d.title === 'Group' || d.title.startsWith('Group By')) != null;
}

/** @internal */
export function isGroupSortAble(col: Column, ctx: IRankingHeaderContext) {
  const toolbar = getFullToolbar(col, ctx);
  return toolbar.find((d) => d.title.startsWith('Sort Groups By')) != null;
}

/** @internal */
export function getToolbarDialogAddons(col: Column, key: string, ctx: IRankingHeaderContext) {
  const cacheKey = `${col.desc.type}@${key}`;
  const cacheAddon = ctx.caches.toolbarAddons;
  if (cacheAddon.has(cacheKey)) {
    return cacheAddon.get(cacheKey)!;
  }

  const keys = getAllToolbarDialogAddons(col, key);
  const actions = ctx.resolveToolbarDialogAddons(col, keys);

  const r = Array.from(new Set(actions)).sort((a, b) => {
    if (a.order === b.order) {
      return a.title.localeCompare(b.title);
    }
    return (a.order || 50) - (b.order || 50);
  });
  cacheAddon.set(cacheKey, r);
  return r;
}
