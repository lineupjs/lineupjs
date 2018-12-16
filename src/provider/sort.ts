import {createIndexArray, ILookUpArray} from '../internal';
import {ECompareValueType, UIntTypedArray, ISortCriteria} from '../model';
import Column, {ICompareValue} from '../model/Column';
import {FIRST_IS_MISSING, FIRST_IS_NAN} from '../model/missing';


/**
 * @internal
 */
export function chooseUIntByDataLength(dataLength?: number | null) {
  if (dataLength == null || typeof dataLength !== 'number' && !isNaN(dataLength)) {
    return ECompareValueType.UINT32; // worst case
  }
  if (length <= 255) {
    return ECompareValueType.UINT8;
  }
  if (length <= 65535) {
    return ECompareValueType.UINT16;
  }
  return ECompareValueType.UINT32;
}


const missingUInt8 = FIRST_IS_MISSING > 0 ? 255 : 0;
const missingBinary = missingUInt8;
const missingUInt16 = FIRST_IS_MISSING > 0 ? 65535 : 0; // max or 0
const missingUInt32 = FIRST_IS_MISSING > 0 ? 4294967295 : 0; // max or 0
const missingInt8 = FIRST_IS_MISSING > 0 ? 127 : -128; // max or min
const missingInt16 = FIRST_IS_MISSING > 0 ? 32767 : -32768; // max or min
const missingInt32 = FIRST_IS_MISSING > 0 ? 2147483647 : -2147483648; // max or min
const missingFloat = FIRST_IS_NAN > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
const missingFloatAsc = FIRST_IS_MISSING > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
const missingString = FIRST_IS_MISSING > 0 ? '\uffff' : '\u0000'; // first or last character


function chooseMissingByLength(length: number) {
  if (length <= 255) {
    return missingBinary;
  }
  if (length <= 65535) {
    return missingUInt16;
  }
  return missingUInt32;
}


function toCompareLookUp(rawLength: number, type: ECompareValueType): ILookUpArray {
  switch (type) {
    case ECompareValueType.COUNT:
      return createIndexArray(rawLength + 1);
    case ECompareValueType.BINARY:
    case ECompareValueType.UINT8:
      return new Uint8Array(rawLength);
    case ECompareValueType.UINT16:
      return new Uint16Array(rawLength);
    case ECompareValueType.UINT32:
      return new Uint32Array(rawLength);
    case ECompareValueType.INT8:
      return new Int8Array(rawLength);
    case ECompareValueType.INT16:
      return new Int16Array(rawLength);
    case ECompareValueType.INT32:
      return new Int32Array(rawLength);
    case ECompareValueType.STRING:
      return <string[]>[];
    case ECompareValueType.FLOAT_ASC:
    case ECompareValueType.FLOAT:
      return new Float32Array(rawLength);
    case ECompareValueType.DOUBLE_ASC:
    case ECompareValueType.DOUBLE:
      return new Float64Array(rawLength);
  }
}


export class CompareLookup {
  private readonly lookups: ILookUpArray[];
  private readonly missingCount: number; // since length dependent
  private readonly comparators: {asc: boolean, v: ECompareValueType}[] = [];

  constructor(rawLength: number, criteria: ISortCriteria[], acc: (d: Column) => ECompareValueType | ECompareValueType[]) {
    for (const c of criteria) {
      const v = acc(c.col);
      if (!Array.isArray(v)) {
        this.comparators.push({asc: c.asc, v});
        continue;
      }
      for (const vi of v) {
        this.comparators.push({asc: c.asc, v: vi});
      }
    }

    this.lookups = this.comparators.map((d) => toCompareLookUp(rawLength, d.v));

    this.missingCount = chooseMissingByLength(rawLength + 1); // + 1 for the value shift to have 0 as start
  }

  get sortOrders() {
    return this.comparators.map((d, i) => ({asc: d.asc, lookup: this.lookups[i]}));
  }

  get transferAbles() {
    // so a typed array
    return this.lookups.filter((d): d is UIntTypedArray | Float32Array => !Array.isArray(d)).map((d) => d.buffer);
  }

  push(index: number, vs: ICompareValue[]) {
    const l = this.comparators.length;
    for (let i = 0; i < l; ++i) {
      const type = this.comparators[i].v;
      const lookup = this.lookups[i];
      const v = vs[i];
      switch (type) {
        case ECompareValueType.BINARY: // just 0 or 1 -> convert to 0=-Ininity 1 2 255=+Infinity
          lookup[index] = v == null || isNaN(<number>v) ? missingBinary : (<number>v) + 1;
          break;
        case ECompareValueType.COUNT: // uint32
          lookup[index] = v == null || isNaN(<number>v) ? this.missingCount : (<number>v) + 1;
          break;
        case ECompareValueType.UINT8: // shift by one to have 0 for -Inf
          lookup[index] = v == null || isNaN(<number>v) ? missingInt8 : (<number>v) + 1;
          break;
        case ECompareValueType.UINT16: // shift by one to have 0 for -Inf
          lookup[index] = v == null || isNaN(<number>v) ? missingInt16 : (<number>v) + 1;
          break;
        case ECompareValueType.UINT32: // shift by one to have 0 for -Inf
          lookup[index] = v == null || isNaN(<number>v) ? missingInt32 : (<number>v) + 1;
          break;
        case ECompareValueType.INT8:
          lookup[index] = v == null || isNaN(<number>v) ? missingInt8 : (<number>v);
          break;
        case ECompareValueType.INT16:
          lookup[index] = v == null || isNaN(<number>v) ? missingInt16 : (<number>v);
          break;
        case ECompareValueType.INT32:
          lookup[index] = v == null || isNaN(<number>v) ? missingInt32 : (<number>v);
          break;
        case ECompareValueType.STRING:
          lookup[index] = v == null || v === '' ? missingString : v;
          break;
        case ECompareValueType.FLOAT:
        case ECompareValueType.DOUBLE:
          lookup[index] = v == null || isNaN(<number>v) ? missingFloat : v;
          break;
        case ECompareValueType.FLOAT_ASC:
        case ECompareValueType.DOUBLE_ASC:
          lookup[index] = v == null || isNaN(<number>v) ? missingFloatAsc : v;
          break;
      }
    }
  }

  free() {
    // free up to save memory
    this.lookups.splice(0, this.lookups.length);
    this.comparators.splice(0, this.comparators.length);
  }
}
