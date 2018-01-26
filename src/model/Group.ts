/**
 * Created by Samuel Gratzl on 24.05.2017.
 */

export interface IGroup {
  name: string;
  color: string;
  parent?: IGroupParent|null;
}

export interface IGroupParent extends IGroup {
  subGroups: (IGroupParent | IGroup)[];
}

export interface IOrderedGroup extends IGroup {
  order: number[];
}

export const defaultGroup: IGroup = {
  name: 'Default',
  color: 'gray'
};

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

export function toGroupID(group: IGroup) {
  return group.name;
}

export function unifyParents<T extends IOrderedGroup>(groups: T[]) {
  if (groups.length <= 1) {
    return;
  }
  const lookup = new Map<string, IGroupParent>();

  const resolve = (g: IGroupParent): { g: IGroupParent, id: string } => {
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
