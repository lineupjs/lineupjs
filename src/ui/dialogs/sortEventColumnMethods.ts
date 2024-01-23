import { EBoxplotDataKeys, type EventColumn } from '../../model';
import type { IToolbarDialogAddonHandler } from '..';
import { sortMethods } from './utils';

/** @internal */
export function sortEventColumnDialogAddon(col: EventColumn, node): IToolbarDialogAddonHandler {
  const sortKeys = col.getEventList();
  if (col.getBoxplotPossible()) {
    for (const key of Object.keys(EBoxplotDataKeys)) {
      sortKeys.push(key);
    }
  }
  return sortMethods(node, col as any, sortKeys);
}
