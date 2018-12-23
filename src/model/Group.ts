import {IGroup} from './interfaces';

export declare type UIntTypedArray = Uint8Array | Uint16Array | Uint32Array;
export declare type IndicesArray = (ReadonlyArray<number> | UIntTypedArray) & ArrayLike<number>;

export interface IOrderedGroup extends IGroup {
  order: IndicesArray;
}

export const defaultGroup: IGroup = {
  name: 'Default',
  color: 'gray'
};
