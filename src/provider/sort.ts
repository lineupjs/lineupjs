import {ICompareValue} from '../model/Column';
import {FIRST_IS_NAN, FIRST_IS_MISSING} from '../model/missing';
import {IndicesArray} from '../model';
import {createWorker, IPoorManWorkerScope, toFunctionBody} from './worker';

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


const missingFloat = FIRST_IS_NAN > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
const missingInt = FIRST_IS_MISSING > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
const missingString = FIRST_IS_MISSING > 0 ? '\uffff' : '\u0000'; // first or last character

export function normalizeCompareValues(vs: ICompareValue[], comparators: {asc: boolean, v: ECompareValueType}[]) {
  const r = comparators.map((d, i) => {
    const v = vs[i];
    switch (d.v) {
      case ECompareValueType.BINARY:
      case ECompareValueType.UINT:
      case ECompareValueType.FLOAT_ASC:
        return v == null || isNaN(<number>v) ? missingInt : v;
      case ECompareValueType.STRING:
        return v == null || v === '' ? missingString : v;
      case ECompareValueType.FLOAT:
        return v == null || isNaN(<number>v) ? missingFloat : v;
    }
  });

  return comparators.length === 1 ? r[0] : r;
}


function asc(a: any, b: any) {
  return a < b ? -1 : ((a > b) ? 1 : 0);
}

function desc(a: any, b: any) {
  return a < b ? 1 : ((a > b) ? -1 : 0);
}

export function sortComplex<T extends {sort: ICompareValue[] | ICompareValue, i: number}>(arr: T[], comparators: {asc: boolean, v: ECompareValueType}[]) {
  if (arr.length < 2 || comparators.length === 0) {
    return arr;
  }

  switch (comparators.length) {
    case 1:
      const f = comparators[0]!.asc ? asc : desc;
      return arr.sort((a, b) => {
        const r = f(a.sort!, b.sort!);
        return r !== 0 ? r : a.i - b.i;
      });
    case 2:
      const f1 = comparators[0]!.asc ? asc : desc;
      const f2 = comparators[1]!.asc ? asc : desc;
      return arr.sort((a, b) => {
        let r = f1((<ICompareValue[]>a.sort)[0], (<ICompareValue[]>b.sort)[0]);
        r = r !== 0 ? r : f2((<ICompareValue[]>a.sort)[1], (<ICompareValue[]>b.sort)[1]);
        return r !== 0 ? r : a.i - b.i;
      });
    default:
      const l = comparators.length;
      const fs = comparators.map((d) => d.asc ? asc : desc);
      return arr.sort((a, b) => {
        for (let i = 0; i < l; ++i) {
          const r = fs[i]((<ICompareValue[]>a.sort)[i], (<ICompareValue[]>b.sort)[i]);
          if (r !== 0) {
            return r;
          }
        }
        return a.i - b.i;
      });
  }
}

function sort2indices(arr: {i: number}[], rawLength: number) {
  //store the ranking index and create an argsort version, i.e. rank 0 -> index i
  const order = chooseByLength(arr.length);
  const index2pos = chooseByLength(rawLength);

  for (let i = 0; i < arr.length; ++i) {
    const ri = arr[i].i;
    order[i] = ri;
    index2pos[ri] = i + 1; // shift by one
  }
  return {order, index2pos};
}

function sort(rawLength: number, arr: {i: number, sort?: ICompareValue[]}[], comparators?: {asc: boolean, v: ECompareValueType}[]) {
  const a = comparators ? sortComplex(<{i: number, sort: ICompareValue[]}[]>arr, comparators) : arr;
  const r = sort2indices(a, rawLength);

  return Promise.resolve(r);
}

export interface ISortWorker {
  sort(rawLength: number, arr: {i: number, sort?: ICompareValue[] | ICompareValue}[], comparators?: {asc: boolean, v: ECompareValueType}[]): Promise<{order: IndicesArray, index2pos: IndicesArray}>;
  terminate(): void;
}

export const local: ISortWorker = {
  sort,
  terminate: () => undefined
};

interface ISortMessageRequest {
  uid: number;

  rawLength: number;
  arr: {i: number, sort?: ICompareValue[]}[];
  comparators?: {asc: boolean, v: ECompareValueType}[];
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

    const arr = r.comparators ? sortComplex(<{i: number, sort: ICompareValue[]}[]>r.arr, r.comparators) : r.arr;
    const res = sort2indices(arr, r.rawLength);

    self.postMessage(<ISortMessageResponse>{
      uid: r.uid,
      order: res.order,
      index2pos: res.index2pos
    }, [res.order.buffer, res.index2pos.buffer]);
  });
}


export class WorkerSortWorker implements ISortWorker {
  private readonly worker: Worker;

  constructor() {
    this.worker = createWorker([
      chooseByLength.toString(),
      sortComplex.toString(),
      sort2indices.toString(),
      toFunctionBody(sortWorkerMain)
    ]);
  }

  sort(rawLength: number, arr: {i: number, sort?: ICompareValue[]}[], comparators?: {asc: boolean, v: ECompareValueType}[]) {
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

      this.worker.addEventListener('message', receiver);
      this.worker.postMessage(<ISortMessageRequest>{
        arr, comparators, rawLength, uid
      });
    });
  }

  terminate() {
    this.worker.terminate();
  }
}
