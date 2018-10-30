import {ICompareValue, ECompareValueType} from '../model/Column';
import {isUnknown, FIRST_IS_NAN, FIRST_IS_MISSING} from '../model/missing';

function numberCompare(a: number | null, b: number | null) {
  const aMissing = isUnknown(a);
  const bMissing = isUnknown(b);

  if (aMissing) { //NaN are smaller
    return bMissing ? 0 : FIRST_IS_NAN;
  }
  if (bMissing) {
    return FIRST_IS_NAN * -1;
  }
  return a! - b!;
}

function stringCompare(a: string | null, b: string | null) {
  const aMissing = a == null || a === '';
  const bMissing = b == null || b === '';

  if (aMissing) {
    return bMissing ? 0 : FIRST_IS_MISSING; //same = 0
  }
  if (bMissing) {
    return -FIRST_IS_MISSING;
  }
  return a!.localeCompare(b!);
}

export function sortNumber(arr: (number | null)[]) {
  return arr.sort(numberCompare);
}

export function sortString(arr: (string | null)[]) {
  return arr.sort(stringCompare);
}

function negate(asc: boolean, v: (a: any, b: any)=>number) {
  return asc ? v : (a: any, b: any) => -v(a, b);
}

export function sortComplex(arr: {sort: ICompareValue[]}[], comparators: {asc: boolean, v: ECompareValueType}[]) {
  const functions: ((a: any, b: any)=>number)[] = comparators.map((d) => negate(d.asc, d.v === ECompareValueType.NUMBER ? numberCompare : stringCompare));

  switch(functions.length) {
    case 0: return arr;
    case 1:
      const f = functions[0]!;
      return arr.sort((a, b) => f(<any>a.sort[0], <any>b.sort[0]));
    case 2:
      const f1 = functions[0]!;
      const f2 = functions[0]!;
      return arr.sort((a, b) => {
        const r = f1(<any>a.sort[0], <any>b.sort[0]);
        return r !== 0 ? r : f2(<any>a.sort[1], <any>b.sort[1]);
      });
    default:
      const l = functions.length;
      return arr.sort((a, b) => {
        for (let i = 0; i < l; ++i) {
          const r = functions[i](<any>a.sort[i], <any>b.sort[i]);
          if (r !== 0) {
            return r;
          }
        }
        return 0;
      });
  }
}
