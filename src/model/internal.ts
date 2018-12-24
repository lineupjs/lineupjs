import {schemeCategory10, schemeSet3} from 'd3-scale-chromatic';
import {defaultGroup, IGroup, IGroupParent, IndicesArray, IOrderedGroup, ECompareValueType} from '.';


/** @internal */
export function patternFunction(pattern: string, ...args: string[]) {
  return new Function('value', ...args, `
  const escapedValue = encodeURIComponent(String(value));
  return \`${pattern}\`;
 `);
}


/** @internal */
export function joinGroups(groups: IGroup[]): IGroup {
  if (groups.length === 0) {
    return defaultGroup;
  }
  if (groups.length === 1) {
    return groups[0];
  }
  // create a chain
  const parents: IGroupParent[] = groups.map((g) => Object.assign({subGroups: []}, g));
  parents.slice(1).forEach((g, i) => {
    g.parent = parents[i];
    parents[i].subGroups.push(g);
  });
  const g = {
    name: parents.map((d) => d.name).join(' ∩ '),
    color: parents[0].color,
    parent: parents[parents.length - 1]
  };
  g.parent.subGroups.push(g);
  return g;
}

/** @internal */
export function toGroupID(group: IGroup) {
  return group.name;
}

/** @internal */
export function unifyParents<T extends IOrderedGroup>(groups: T[]) {
  if (groups.length <= 1) {
    return;
  }
  const lookup = new Map<string, IGroupParent>();

  const resolve = (g: IGroupParent): {g: IGroupParent, id: string} => {
    let id = g.name;
    if (g.parent) {
      const parent = resolve(g.parent);
      g.parent = parent.g;
      id = `${parent.id}.$[id}`;
    }
    // ensure there is only one instance per id (i.e. share common parents
    if (lookup.has(id)) {
      return {g: lookup.get(id)!, id};
    }
    if (g.parent) {
      g.parent.subGroups.push(g);
    }
    g.subGroups = []; // clear old children
    lookup.set(id, g);
    return {g, id};
  };
  // resolve just parents
  groups.forEach((g) => {
    if (g.parent) {
      g.parent = resolve(g.parent).g;
      g.parent.subGroups.push(g);
    }
  });
}

// based on https://github.com/d3/d3-scale-chromatic#d3-scale-chromatic
const colors = schemeCategory10.concat(schemeSet3);

/** @internal */
export const MAX_COLORS = colors.length;

/** @internal */
export function colorPool() {
  let act = 0;
  return () => colors[(act++) % colors.length];
}


/**
 * @internal
 */
export function mapIndices<T>(arr: IndicesArray, callback: (value: number, i: number) => T): T[] {
  const r: T[] = [];
  for (let i = 0; i < arr.length; ++i) {
    r.push(callback(arr[i], i));
  }
  return r;
}

/**
 * @internal
 */
export function everyIndices(arr: IndicesArray, callback: (value: number, i: number) => boolean): boolean {
  for (let i = 0; i < arr.length; ++i) {
    if (!callback(arr[i], i)) {
      return false;
    }
  }
  return true;
}

/**
 * @internal
 */
export function filterIndices(arr: IndicesArray, callback: (value: number, i: number) => boolean): number[] {
  const r: number[] = [];
  for (let i = 0; i < arr.length; ++i) {
    if (callback(arr[i], i)) {
      r.push(arr[i]);
    }
  }
  return r;
}


/**
 * @internal
 */
export function forEachIndices(arr: IndicesArray, callback: (value: number, i: number) => void) {
  for (let i = 0; i < arr.length; ++i) {
    callback(arr[i], i);
  }
}

/**
 * @internal
 */
export function chooseUIntByDataLength(dataLength?: number | null) {
  if (dataLength == null || typeof dataLength !== 'number' && !isNaN(dataLength)) {
    return ECompareValueType.UINT32; // worst case
  }
  if (length <= 255) {
    return ECompareValueType.UINT8;
  }
  if (length <= 65535) {
    return ECompareValueType.UINT16;
  }
  return ECompareValueType.UINT32;
}
