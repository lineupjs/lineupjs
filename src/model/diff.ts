import { equal } from 'src/internal';
import type { IColumnDump, ITypeFactory } from './interfaces';
import type Column from './Column';

export function restoreValue<T, E>(dumped: T | undefined, current: T, changed: Set<E>, changeName: E | E[]): T {
  if (dumped === undefined) {
    return current;
  }
  if (current === dumped || equal(dumped, current)) {
    return current;
  }
  if (Array.isArray(changeName)) {
    for (const changeNameEntry of changeName) {
      changed.add(changeNameEntry);
    }
  } else {
    changed.add(changeName);
  }
  return dumped;
}

export function restoreTypedValue<T extends { toJSON(): R }, R, E>(
  dumped: R | undefined,
  current: T,
  restore: (v: R) => T,
  changed: Set<E>,
  changeName: E | E[]
): T {
  const currentDump = current.toJSON();
  const target = restoreValue(dumped, currentDump, changed, changeName);
  if (target !== currentDump) {
    return restore(target);
  }
  return current;
}

export function matchColumns(
  dumped: IColumnDump[] | undefined,
  current: Column[],
  changed: Set<string>,
  factory: ITypeFactory
):
  | {
      columns: Column[];
      moved: { column: Column; i: number }[];
      added: { column: Column; i: number }[];
      removed: { column: Column; i: number }[];
    }
  | undefined {
  if (dumped == null) {
    return undefined;
  }

  const lookup = new Map(current.map((d, i) => [d.id, { column: d, i }]));
  const moved: { column: Column; i: number }[] = [];
  const added: { column: Column; i: number }[] = [];
  const removed: { column: Column; i: number }[] = [];

  const target = dumped.map((child: IColumnDump, i) => {
    const existing = lookup.get(child.id);
    if (existing != null) {
      lookup.delete(child.id);
      if (existing.i !== i) {
        moved.push(existing);
      }
      const subChanged = existing.column.restore(child, factory);
      subChanged.forEach((c) => changed.add(c));
      return existing.column;
    }
    // need new
    const c = factory(child);
    added.push({ column: c, i });
    return c;
  });
  current.forEach((c, i) => {
    if (lookup.has(c.id)) {
      // used
      return;
    }
    // remove
    removed.push({
      column: c,
      i,
    });
  });
  if (moved.length > 0 || added.length > 0 || removed.length > 0) {
    return {
      columns: target,
      moved,
      added,
      removed,
    };
  }
  return undefined;
}
