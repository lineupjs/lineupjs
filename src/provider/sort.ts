import {ICompareValue, ECompareValueType} from '../model/Column';
import {FIRST_IS_NAN, FIRST_IS_MISSING} from '../model/missing';

const missingFloat = FIRST_IS_NAN > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
const missingInt = FIRST_IS_MISSING > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
const missingString = FIRST_IS_MISSING > 0 ? '\uffff' : '\u0000'; // first or last character
const compare = new Intl.Collator();

function floatCompare(a: number | null, b: number | null) {
  const av = a == null || isNaN(a) ? missingFloat : a;
  const bv = b == null || isNaN(b) ? missingFloat : b;
  return av - bv;
}

function uintCompare(a: number | null, b: number | null) {
  const av = a == null || isNaN(a) ? missingInt : a;
  const bv = b == null || isNaN(b) ? missingInt : b;
  return av - bv;
}

function stringCompareDesc(a: string | null, b: string | null) {
  const av = a == null || a === '' ? missingString : a;
  const bv = b == null || b === '' ? missingString : b;
  return compare.compare(bv, av);
}

function floatCompareDesc(a: number | null, b: number | null) {
  const av = a == null || isNaN(a) ? missingFloat : a;
  const bv = b == null || isNaN(b) ? missingFloat : b;
  return bv - av;
}

function uintCompareDesc(a: number | null, b: number | null) {
  const av = a == null || isNaN(a) ? missingInt : a;
  const bv = b == null || isNaN(b) ? missingInt : b;
  return bv - av;
}

function stringCompare(a: string | null, b: string | null) {
  const av = a == null || a === '' ? missingString : a;
  const bv = b == null || b === '' ? missingString : b;
  return compare.compare(av, bv);
}

export function sortNumber(arr: (number | null)[]) {
  return arr.sort(floatCompare);
}

export function sortString(arr: (string | null)[]) {
  return arr.sort(stringCompare);
}

function toFunction(f:  {asc: boolean, v: ECompareValueType}): (a: any, b: any)=>number {
  switch(f.v) {
  case ECompareValueType.BINARY:
  case ECompareValueType.UINT:
    return f.asc ? uintCompare : uintCompareDesc;
  case ECompareValueType.FLOAT:
    return f.asc ? floatCompare : floatCompareDesc;
  case ECompareValueType.STRING:
    return f.asc ? stringCompare : stringCompareDesc;
  }
}

export function sortComplex(arr: {sort: ICompareValue[]}[], comparators: {asc: boolean, v: ECompareValueType}[]) {
  const functions = comparators.map(toFunction);

  switch(functions.length) {
    case 0: return arr;
    case 1:
      const f = functions[0]!;
      return arr.sort((a, b) => f(a.sort[0], b.sort[0]));
    case 2:
      const f1 = functions[0]!;
      const f2 = functions[0]!;
      return arr.sort((a, b) => {
        const r = f1(a.sort[0], b.sort[0]);
        return r !== 0 ? r : f2(a.sort[1], b.sort[1]);
      });
    default:
      const l = functions.length;
      return arr.sort((a, b) => {
        for (let i = 0; i < l; ++i) {
          const r = functions[i](a.sort[i], b.sort[i]);
          if (r !== 0) {
            return r;
          }
        }
        return 0;
      });
  }
}
