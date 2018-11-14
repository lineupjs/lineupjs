import {IGroup} from './interfaces';


export function isMissingValue(v: any): boolean {
  if(v == null || v === undefined || v === '' || v === 'NA' || v === 'na' || v === 'Na' || v === 'nA' || v === 'NaN' || (typeof v === 'number' && isNaN(v))) {
    return true;
  }
  if (!Array.isArray(v)) {
    return false;
  }
  for (const vi of v) {
    if (!isMissingValue(vi)) {
      return false;
    }
  }
  return true;
}

/** @internal */
export function isUnknown(v?: number | null) {
  return v == null || v === undefined || isNaN(v);
}

/** @internal */
export const FIRST_IS_NAN = -1;
/** @internal */
export const FIRST_IS_MISSING = 1;


/** @internal */
export const missingGroup: IGroup = {
  name: 'Missing values',
  color: 'gray'
};
