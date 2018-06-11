import {IGroup} from './interfaces';


export interface IOrderedGroup extends IGroup {
  order: number[];
}

export const defaultGroup: IGroup = {
  name: 'Default',
  color: 'gray'
};
