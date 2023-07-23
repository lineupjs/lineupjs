import { equal } from 'src/internal';

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
