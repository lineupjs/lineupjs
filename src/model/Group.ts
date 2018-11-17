import {IGroup} from './interfaces';


export interface IOrderedGroup extends IGroup {
  order: Uint32Array;
  index2pos: Uint32Array;
}

export const defaultGroup: IGroup = {
  name: 'Default',
  color: 'gray'
};
