import {createIndexArray, ILookUpArray} from '../internal';
import {FIRST_IS_MISSING, FIRST_IS_NAN, ECompareValueType, ICompareValue, Column, UIntTypedArray, Ranking, IDataRow} from '../model';


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

function createSetter(type: ECompareValueType, lookup: ILookUpArray, missingCount: number): ((index: number, v: ICompareValue) => void) {
  switch (type) {
    case ECompareValueType.BINARY: // just 0 or 1 -> convert to 0=-Ininity 1 2 255=+Infinity
      return (index, v) => lookup[index] = v == null || isNaN(<number>v) ? missingBinary : (<number>v) + 1;
    case ECompareValueType.COUNT: // uint32
      return (index, v) => lookup[index] = v == null || isNaN(<number>v) ? missingCount : (<number>v) + 1;
    case ECompareValueType.UINT8: // shift by one to have 0 for -Inf
      return (index, v) => lookup[index] = v == null || isNaN(<number>v) ? missingInt8 : (<number>v) + 1;
    case ECompareValueType.UINT16: // shift by one to have 0 for -Inf
      return (index, v) => lookup[index] = v == null || isNaN(<number>v) ? missingInt16 : (<number>v) + 1;
    case ECompareValueType.UINT32: // shift by one to have 0 for -Inf
      return (index, v) => lookup[index] = v == null || isNaN(<number>v) ? missingInt32 : (<number>v) + 1;
    case ECompareValueType.INT8:
      return (index, v) => lookup[index] = v == null || isNaN(<number>v) ? missingInt8 : (<number>v);
    case ECompareValueType.INT16:
      return (index, v) => lookup[index] = v == null || isNaN(<number>v) ? missingInt16 : (<number>v);
    case ECompareValueType.INT32:
      return (index, v) => lookup[index] = v == null || isNaN(<number>v) ? missingInt32 : (<number>v);
    case ECompareValueType.STRING:
      return (index, v) => lookup[index] = v == null || v === '' ? missingString : v;
    case ECompareValueType.FLOAT:
    case ECompareValueType.DOUBLE:
      return (index, v) => lookup[index] = v == null || isNaN(<number>v) ? missingFloat : v;
    case ECompareValueType.FLOAT_ASC:
    case ECompareValueType.DOUBLE_ASC:
      return (index, v) => lookup[index] = v == null || isNaN(<number>v) ? missingFloatAsc : v;
  }
}

export class CompareLookup {
  private readonly criteria: {col: Column, valueCache?(dataIndex: number): any}[] = [];
  private readonly data: {asc: boolean, v: ECompareValueType, lookup: ILookUpArray, setter: (dataIndex: number, value: ICompareValue) => void}[] = [];

  constructor(rawLength: number, isSorting: boolean, ranking: Ranking, valueCaches?: (col: Column) => (undefined | ((i: number) => any))) {
    const missingCount = chooseMissingByLength(rawLength + 1); // + 1 for the value shift to have 0 as start

    for (const c of (isSorting ? ranking.getSortCriteria() : ranking.getGroupSortCriteria())) {
      const v = (isSorting ? c.col.toCompareValueType() : c.col.toCompareGroupValueType());
      const valueCache = valueCaches ? valueCaches(c.col) : undefined;
      this.criteria.push({col: c.col, valueCache});
      if (!Array.isArray(v)) {
        const lookup = toCompareLookUp(rawLength, v);
        this.data.push({asc: c.asc, v, lookup, setter: createSetter(v, lookup, missingCount)});
        continue;
      }
      for (const vi of v) {
        const lookup = toCompareLookUp(rawLength, vi);
        this.data.push({asc: c.asc, v: vi, lookup, setter: createSetter(vi, lookup, missingCount)});
      }
    }

    if (isSorting) {
      return;
    }

    {
      const v = ECompareValueType.STRING;
      const lookup = toCompareLookUp(rawLength, v);
      this.data.push({asc: true, v, lookup, setter: createSetter(v, lookup, missingCount)});
    }
  }

  get sortOrders() {
    return this.data.map((d) => ({asc: d.asc, lookup: d.lookup}));
  }

  get transferAbles() {
    // so a typed array
    return this.data.map((d) => d.lookup).filter((d): d is UIntTypedArray | Float32Array => !Array.isArray(d)).map((d) => d.buffer);
  }

  push(row: IDataRow) {
    let i = 0;
    for (const c of this.criteria) {
      const r = c.col.toCompareValue(row, c.valueCache ? c.valueCache(row.i) : undefined);
      if (!Array.isArray(r)) {
        this.data[i++].setter(row.i, r);
        continue;
      }
      for (const ri of r) {
        this.data[i++].setter(row.i, ri);
      }
    }
  }

  pushValues(dataIndex: number, vs: ICompareValue[]) {
    for (let i = 0; i < vs.length; ++i) {
      this.data[i].setter(dataIndex, vs[i]);
    }
  }

  free() {
    // free up to save memory
    this.data.splice(0, this.data.length);
  }
}
