import {ICompareValue} from '../model/Column';
import {FIRST_IS_NAN, FIRST_IS_MISSING} from '../model/missing';
import {IndicesArray, UIntTypedArray} from '../model';
import {IPoorManWorkerScope, toFunctionBody, createWorkerCodeBlob} from './worker';
import {ISequence} from '../internal/interable';

export enum ECompareValueType {
  BINARY,
  COUNT, // count max to the number of rows
  UINT8,
  UINT16,
  UINT32,
  INT8,
  INT16,
  INT32,
  FLOAT,
  FLOAT_ASC,
  DOUBLE,
  DOUBLE_ASC,
  STRING
}

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

/**
 * @internal
 */
export function createIndexArray(length: number) {
  if (length <= 255) {
    return new Uint8Array(length);
  }
  if (length <= 65535) {
    return new Uint16Array(length);
  }
  return new Uint32Array(length);
}

function toIndexArray(arr: ISequence<number>): UIntTypedArray {
  const l = arr.length;
  if (l <= 255) {
    return Uint8Array.from(arr);
  }
  if (l <= 65535) {
    return Uint16Array.from(arr);
  }
  return Uint32Array.from(arr);
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

declare type ILookUpArray = Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | string[] | Float32Array | Float64Array;


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

  constructor(rawLength: number, private readonly comparators: {asc: boolean, v: ECompareValueType}[]) {
    this.lookups = comparators.map((d) => toCompareLookUp(rawLength, d.v));

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


function sort(indices: number[], _singleCall: boolean, lookups?: CompareLookup) {
  const order = toIndexArray(indices);
  if (lookups) {
    sortComplex(order, lookups.sortOrders);
  }
  return Promise.resolve(order);
}

export interface ISortWorker {
  sort(indices: number[], singleCall: boolean, lookups?: CompareLookup): Promise<IndicesArray>;
  terminate(): void;
}

export const local: ISortWorker = {
  sort,
  terminate: () => undefined
};

interface ISortMessageRequest {
  uid: number;

  indices: UIntTypedArray;
  sortOrders?: {asc: boolean, lookup: ILookUpArray}[];
}

interface ISortMessageResponse {
  uid: number;

  order: IndicesArray;
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
    self.postMessage(<ISortMessageResponse>{
      uid: r.uid,
      order: r.indices
    }, [r.indices.buffer]);
  });
}

const SHOULD_USE_WORKER = 50000;
const MAX_WORKER_THREADS = 10;
const MIN_WORKER_THREADS = 2;
const THREAD_CLEANUP_TIME = 2;


export class WorkerSortWorker implements ISortWorker {
  private readonly workerPool: Worker[] = [];
  private cleanUpWorkerTimer: number = -1;

  private readonly workerBlob = createWorkerCodeBlob([
    createIndexArray.toString(),
    asc.toString(),
    desc.toString(),
    sortComplex.toString(),
    toFunctionBody(sortWorkerMain)
  ]);

  constructor() {
    // start with two worker
    for (let i = 0; i < MIN_WORKER_THREADS; ++i) {
      this.workerPool.push(new Worker(this.workerBlob));
      this.workerPool.push(new Worker(this.workerBlob));
    }
  }

  private readonly cleanUp = () => {
    this.workerPool.splice(0, MIN_WORKER_THREADS).forEach((w) => w.terminate());
  }

  private checkOut() {
    if (this.cleanUpWorkerTimer >= 0) {
      clearTimeout(this.cleanUpWorkerTimer);
      this.cleanUpWorkerTimer = -1;
    }

    if (this.workerPool.length > 0) {
      return this.workerPool.shift()!;
    }
    return new Worker(this.workerBlob);
  }

  private checkIn(worker: Worker) {
    this.workerPool.push(worker);

    if (this.workerPool.length >= MAX_WORKER_THREADS) {
      this.workerPool.splice(0, MAX_WORKER_THREADS).forEach((w) => w.terminate());
    }
    if (this.cleanUpWorkerTimer === -1) {
      this.cleanUpWorkerTimer = self.setTimeout(this.cleanUp, THREAD_CLEANUP_TIME);
    }
  }

  sort(indices: number[], singleCall: boolean, lookups?: CompareLookup) {

    if (!lookups || indices.length < SHOULD_USE_WORKER) {
      // no thread needed
      return sort(indices, singleCall, lookups);
    }

    return new Promise<IndicesArray>((resolve) => {
      const uid = Math.random();

      const worker = this.checkOut();

      const receiver = (msg: MessageEvent) => {
        const r = <ISortMessageResponse>msg.data;
        if (r.uid !== uid) {
          return;
        }
        worker.removeEventListener('message', receiver);
        this.checkIn(worker);
        resolve(r.order);
      };

      const indexArray = toIndexArray(indices);

      const toTransfer = [indexArray.buffer];

      if (singleCall) {
        // can transfer otherwise need to copy
        toTransfer.push(...lookups.transferAbles);
      }

      worker.addEventListener('message', receiver);
      worker.postMessage(<ISortMessageRequest>{
        uid,
        indices: indexArray,
        sortOrders: lookups.sortOrders
      }, toTransfer);
    });
  }

  terminate() {
    this.workerPool.splice(0, this.workerPool.length).forEach((w) => w.terminate());
  }
}
