/**
 * Created by Samuel Gratzl on 11.10.2017.
 */


export function isMissingValue(v: any) {
  return typeof(v) === 'undefined' || v == null || (typeof v === 'number' && isNaN(v)) || v === '' || v === 'NA' || (typeof(v) === 'string' && (v.toLowerCase() === 'na'));
}

export function isUnknown(v?: number | null) {
  return v === null || v === undefined || isNaN(v);
}

export const FIRST_IS_NAN = -1;
