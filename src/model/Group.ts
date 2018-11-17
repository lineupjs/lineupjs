import {IGroup} from './interfaces';

export declare type IndicesArray = ReadonlyArray<number> | Uint32Array | Uint16Array | Uint8Array;

export interface IOrderedGroup extends IGroup {
  order: IndicesArray;
  index2pos: IndicesArray;
}

export const defaultGroup: IGroup = {
  name: 'Default',
  color: 'gray'
};

/**
 * @internal
 */
export function chooseByLength(length: number) {
  if (length <= 255) {
    return new Uint8Array(length);
  }
  if (length <= 32767) {
    return new Uint16Array(length);
  }
  return new Uint32Array(length);
}
