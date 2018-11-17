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
export function mapIndices<T>(arr: IndicesArray, callback: (value: number, i: number) => T): T[] {
  const r: T[] = [];
  for (let i = 0; i < arr.length; ++i) {
    r.push(callback(arr[i], i));
  }
  return r;
}
