import {ICompareValue} from '../model/Column';
import {FIRST_IS_NAN, FIRST_IS_MISSING} from '../model/missing';
import {IndicesArray, UIntTypedArray} from '../model';
import {createWorker, IPoorManWorkerScope, toFunctionBody} from './worker';
import {ISequence} from '../internal/interable';

export enum ECompareValueType {
  FLOAT = 0,
  BINARY = 1,
  UINT = 2,
  STRING = 3,
  FLOAT_ASC = 4,
}

/**
 * @internal
 */
export function chooseByLength(length: number) {
  if (length <= 255) {
    return new Uint8Array(length);
  }
  if (length <= 65535) {
    return new Uint16Array(length);
  }
  return new Uint32Array(length);
}

function fromByLength(arr: ISequence<number>) {
  const l = arr.length;
  if (l <= 255) {
    return Uint8Array.from(arr);
  }
  if (l <= 65535) {
    return Uint16Array.from(arr);
  }
  return Uint32Array.from(arr);
}


const missingBinary = FIRST_IS_MISSING > 0 ? 255 : 0;
const missingUInt16 = FIRST_IS_MISSING > 0 ? 65535 : 0; // max or 0
const missingUInt32 = FIRST_IS_MISSING > 0 ? 4294967295 : 0; // max or 0
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

declare type ILookUpArray = UIntTypedArray | string[] | Float32Array;


function toCompareLookUp(rawLength: number, type: ECompareValueType): ILookUpArray {
  switch (type) {
    case ECompareValueType.BINARY:
      return new Uint8Array(rawLength);
    case ECompareValueType.UINT:
      return chooseByLength(rawLength + 1);
    case ECompareValueType.STRING:
      return <string[]>[];
    case ECompareValueType.FLOAT_ASC:
    case ECompareValueType.FLOAT:
      return new Float32Array(rawLength);
  }
}


export class CompareLookup {
  private readonly lookups: ILookUpArray[];
  private readonly missingUInt: number; // since length dependent

  constructor(rawLength: number, private readonly comparators: {asc: boolean, v: ECompareValueType}[]) {
    this.lookups = comparators.map((d) => toCompareLookUp(rawLength, d.v));

    this.missingUInt = chooseMissingByLength(rawLength + 1); // + 1 for the value shift to have 0 as start
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
        case ECompareValueType.UINT: // uint32
          lookup[index] = v == null || isNaN(<number>v) ? this.missingUInt : (<number>v) + 1;
          break;
        case ECompareValueType.FLOAT_ASC:
          lookup[index] = v == null || isNaN(<number>v) ? missingFloatAsc : v;
          break;
        case ECompareValueType.STRING:
          lookup[index] = v == null || v === '' ? missingString : v;
          break;
        case ECompareValueType.FLOAT:
          lookup[index] = v == null || isNaN(<number>v) ? missingFloat : v;
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


function asc(a: any, b: any) {
  return a < b ? -1 : ((a > b) ? 1 : 0);
}

function desc(a: any, b: any) {
  return a < b ? 1 : ((a > b) ? -1 : 0);
}

export function sortComplex(indices: UIntTypedArray | number[], comparators: {asc: boolean, lookup: ILookUpArray}[]) {
  if (indices.length < 2 || comparators.length === 0) {
    return indices;
  }

  switch (comparators.length) {
    case 1:
      const f = comparators[0]!.asc ? asc : desc;
      const fl = comparators[0]!.lookup;
      return indices.sort((a, b) => {
        const r = f(fl[a]!, fl[b]!);
        return r !== 0 ? r : a - b;
      });
    case 2:
      const f1 = comparators[0]!.asc ? asc : desc;
      const f1l = comparators[0]!.lookup;
      const f2 = comparators[1]!.asc ? asc : desc;
      const f2l = comparators[1]!.lookup;
      return indices.sort((a, b) => {
        let r = f1(f1l[a], f1l[b]);
        r = r !== 0 ? r : f2(f2l[a], f2l[b]);
        return r !== 0 ? r : a - b;
      });
    default:
      const l = comparators.length;
      const fs = comparators.map((d) => d.asc ? asc : desc);
      return indices.sort((a, b) => {
        for (let i = 0; i < l; ++i) {
          const l = comparators[i].lookup;
          const r = fs[i](l[a], l[b]);
          if (r !== 0) {
            return r;
          }
        }
        return a - b;
      });
  }
}


function order2pos(rawLength: number, order: UIntTypedArray) {
  const index2pos = chooseByLength(rawLength);
  for (let i = 0; i < order.length; ++i) {
    const dataIndex = order[i];
    index2pos[dataIndex] = i + 1; // shift by one
  }
  return index2pos;
}

function sort(rawLength: number, indices: number[], _singleCall: boolean, lookups?: CompareLookup) {
  const order = fromByLength(indices);
  if (lookups) {
    sortComplex(order, lookups.sortOrders);
  }
  const index2pos = order2pos(rawLength, order);

  return Promise.resolve({order, index2pos});
}

export interface ISortWorker {
  sort(rawLength: number, indices: number[], singleCall: boolean, lookups?: CompareLookup): Promise<{order: IndicesArray, index2pos: IndicesArray}>;
  terminate(): void;
}

export const local: ISortWorker = {
  sort,
  terminate: () => undefined
};

interface ISortMessageRequest {
  uid: number;

  rawLength: number;
  indices: UIntTypedArray;
  sortOrders?: {asc: boolean, lookup: ILookUpArray}[];
}

interface ISortMessageResponse {
  uid: number;

  order: IndicesArray;
  index2pos: IndicesArray;
}


function sortWorkerMain(self: IPoorManWorkerScope) {
  self.addEventListener('message', (evt) => {
    const r = <ISortMessageRequest>evt.data;
    if (typeof r.uid !== 'number') {
      return;
    }

    if (r.sortOrders) {
      sortComplex(r.indices, r.sortOrders);
    }
    // since inplace sorting
    const index2pos = order2pos(r.rawLength, r.indices);
    self.postMessage(<ISortMessageResponse>{
      uid: r.uid,
      order: r.indices,
      index2pos,
    }, [r.indices.buffer, index2pos.buffer]);
  });
}


export class WorkerSortWorker implements ISortWorker {
  private readonly worker: Worker;

  constructor() {
    this.worker = createWorker([
      chooseByLength.toString(),
      asc.toString(),
      desc.toString(),
      sortComplex.toString(),
      order2pos.toString(),
      toFunctionBody(sortWorkerMain)
    ]);
  }

  sort(rawLength: number, indices: number[], singleCall: boolean, lookups?: CompareLookup) {

    if (!lookups) {
      // no thread needed
      return sort(rawLength, indices, singleCall);
    }

    return new Promise<{order: IndicesArray, index2pos: IndicesArray}>((resolve) => {
      const uid = Math.random();

      const receiver = (msg: MessageEvent) => {
        const r = <ISortMessageResponse>msg.data;
        if (r.uid !== uid) {
          return;
        }
        this.worker.removeEventListener('message', receiver);
        resolve({order: r.order, index2pos: r.index2pos});
      };

      const indexArray = fromByLength(indices);

      const toTransfer = [indexArray.buffer];

      if (singleCall) {
        // can transfer otherwise need to copy
        toTransfer.push(...lookups.transferAbles);
      }

      this.worker.addEventListener('message', receiver);
      this.worker.postMessage(<ISortMessageRequest>{
        uid,
        rawLength,
        indices: indexArray,
        sortOrders: lookups.sortOrders
      }, toTransfer);
    });
  }

  terminate() {
    this.worker.terminate();
  }
}
