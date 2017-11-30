/**
 * Created by Samuel Gratzl on 11.10.2017.
 */
import {IGroup} from './Group';


export function isMissingValue(v: any) : boolean {
  return typeof(v) === 'undefined' || v == null || (typeof v === 'number' && isNaN(v)) || v === '' || v === 'NA' || (typeof(v) === 'string' && (v.toLowerCase() === 'na') || (v instanceof Array && v.every((v) => isMissingValue(v))));
}

export function isUnknown(v?: number | null) {
  return v === null || v === undefined || isNaN(v);
}

export const FIRST_IS_NAN = -1;


export const missingGroup: IGroup = {
  name: 'Missing values',
  color: 'gray'
};
