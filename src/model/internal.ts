import {computeBoxPlot, IAdvancedBoxPlotData} from '../internal';
import {IOrderedGroup} from './Group';
import {IDataRow, IGroup, IGroupParent} from './interfaces';
import INumberColumn, {numberCompare} from './INumberColumn';
import {schemeCategory10, schemeSet3} from 'd3-scale-chromatic';
import {ISequence} from '../internal/interable';


/** @internal */
export function patternFunction(pattern: string, ...args: string[]) {
  return new Function('value', ...args, `
  const escapedValue = encodeURIComponent(String(value));
  return \`${pattern}\`;
 `);
}


/** @internal */
export function joinGroups(groups: IGroup[]): IGroup {
  console.assert(groups.length > 0);
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


/** @internal */
export function medianIndex(rows: ISequence<IDataRow>, col: INumberColumn) {
  //return the median row
  const data = rows.map((r, i) => ({r, i, v: col.getNumber(r)}));
  const sorted = Array.from(data.filter((r) => !isNaN(r.v))).sort((a, b) => numberCompare(a.v, b.v));
  const index = sorted[Math.floor(sorted.length / 2.0)];
  if (index === undefined) {
    return {index: 0, row: sorted[0]!.r}; //error case
  }
  return {index: index.i, row: index.r};
}

/** @internal */
export function groupCompare(a: ISequence<IDataRow>, b: ISequence<IDataRow>, col: INumberColumn, sortMethod: keyof IAdvancedBoxPlotData) {
  const va = computeBoxPlot(a.map((row) => col.getNumber(row)));
  const vb = computeBoxPlot(b.map((row) => col.getNumber(row)));

  return numberCompare(<number>va[sortMethod], <number>vb[sortMethod]);
}

/** @internal */
export function toCompareGroupValue(rows: ISequence<IDataRow>, col: INumberColumn, sortMethod: keyof IAdvancedBoxPlotData) {
  const vs = computeBoxPlot(rows.map((row) => col.getNumber(row)));
  return <number>vs[sortMethod];
}
