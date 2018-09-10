import {isUnknown, FIRST_IS_NAN, FIRST_IS_MISSING} from '../model/missing';


export enum ESortMode {
  NUMBER,
  STRING
}

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

export function sortComplex(arr: (string | number | null)[][], comparators: ESortMode[]) {
  const functions = comparators.map((d) => d === ESortMode.NUMBER ? numberCompare : stringCompare);

  return arr.sort((a, b) => {
    for (let i = 0; i < functions.length; ++i) {
      const f: (a: any, b: any)=>number = functions[i];
      const r = f(<any>a[i], <any>b[i]);
      if (r !== 0) {
        return r;
      }
    }
    return 0;
  });
}
