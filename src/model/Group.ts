/**
 * Created by Samuel Gratzl on 24.05.2017.
 */

export interface IGroup {
  name: string;
  color: string;
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
  return {
    name: groups.map((d) => d.name).join(' ∩ '),
    color: groups[0].color
  };
}
