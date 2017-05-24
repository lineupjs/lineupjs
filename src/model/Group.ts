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
}
