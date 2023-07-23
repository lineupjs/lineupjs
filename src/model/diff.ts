import type { IColumnDump } from './interfaces';

export function dumpValue<T>(dump: IColumnDump, key: keyof IColumnDump, current: T, defaultValue: T | undefined) {
  if (current === defaultValue) {
    return;
  }
  dump[key] = current;
}

export function restoreValue<T, E>(dumped: T | undefined, current: T, changed: Set<E>, changeName: E | E[]): T {
  if (dumped === undefined || current === dumped) {
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
