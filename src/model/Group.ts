import {IGroup} from './interfaces';


export interface IOrderedGroup extends IGroup {
  order: number[];
  index2pos: number[];
}

export const defaultGroup: IGroup = {
  name: 'Default',
  color: 'gray'
};
