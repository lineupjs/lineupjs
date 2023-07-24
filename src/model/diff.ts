import { equal } from '../internal';

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

export function matchElements<D extends { id?: string }, T extends { id: string }>(
  dumped: D[] | undefined,
  current: T[],
  restore: (elem: T, dump: D) => void,
  factory: (dump: D) => T
):
  | {
      elems: T[];
      moved: { elem: T; i: number }[];
      added: { elem: T; i: number }[];
      removed: { elem: T; i: number }[];
    }
  | undefined {
  if (dumped == null) {
    return undefined;
  }

  const lookup = new Map(current.map((d, i) => [d.id, { elem: d, i }]));
  const moved: { elem: T; i: number }[] = [];
  const added: { elem: T; i: number }[] = [];
  const removed: { elem: T; i: number }[] = [];

  const target = dumped.map((dump, i) => {
    const existing = lookup.get(dump.id);
    if (existing != null) {
      lookup.delete(dump.id);
      if (existing.i !== i) {
        moved.push(existing);
      }
      restore(existing.elem, dump);
      return existing.elem;
    }
    // need new
    const c = factory(dump);
    added.push({ elem: c, i });
    return c;
  });
  current.forEach((c, i) => {
    if (!lookup.has(c.id)) {
      // used
      return;
    }
    // remove
    removed.push({
      elem: c,
      i,
    });
  });
  if (moved.length > 0 || added.length > 0 || removed.length > 0) {
    return {
      elems: target,
      moved,
      added,
      removed,
    };
  }
  return undefined;
}
