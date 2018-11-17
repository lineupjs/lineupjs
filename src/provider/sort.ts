import {ICompareValue, ECompareValueType} from '../model/Column';
import {FIRST_IS_NAN, FIRST_IS_MISSING} from '../model/missing';
import {IndicesArray} from '../model';
import {createWorker, IPoorManWorkerScope, toFunctionBody} from './worker';


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

export function sortComplex<T extends {sort: ICompareValue[]}>(arr: T[], comparators: {asc: boolean, v: ECompareValueType}[]) {
  if (arr.length < 2) {
    return arr;
  }

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

function sort2indices(arr: {i: number}[], rawLength: number) {
  //store the ranking index and create an argsort version, i.e. rank 0 -> index i
  const order = chooseByLength(arr.length);
  const index2pos = chooseByLength(rawLength);

  for (let i = 0; i < arr.length; ++i) {
    const ri = arr[i].i;
    order[i] = ri;
    index2pos[ri] = i;
  }
  return {order, index2pos};
}

function sort(rawLength: number, arr: {i: number, sort: ICompareValue[]}[], comparators?: {asc: boolean, v: ECompareValueType}[]) {
  const a = comparators ? sortComplex(arr, comparators) : arr;
  const r = sort2indices(a, rawLength);

  return Promise.resolve(r);
}

export interface ISortWorker {
  sort(rawLength: number, arr: {i: number, sort: ICompareValue[]}[], comparators?: {asc: boolean, v: ECompareValueType}[]): Promise<{order: IndicesArray, index2pos: IndicesArray}>;
  terminate(): void;
}

export const local: ISortWorker = {
  sort,
  terminate: () => undefined
};

interface ISortMessageRequest {
  uid: number;

  rawLength: number;
  arr: {i: number, sort: ICompareValue[]}[];
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

    const arr = r.comparators ? sortComplex(r.arr, r.comparators) : r.arr;
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
      `var missingFloat = ${missingFloat};`,
      `var missingInt = ${missingInt};`,
      `var missingString = '${missingString}';`,
      `var compare = new Intl.Collator();`,
      floatCompare,
      uintCompare,
      stringCompare,
      floatCompareDesc,
      uintCompareDesc,
      stringCompareDesc,
      toFunction.toString(),
      sortComplex.toString(),
      sort2indices.toString(),
      toFunctionBody(sortWorkerMain)
    ]);
  }

  sort(rawLength: number, arr: {i: number, sort: ICompareValue[]}[], comparators?: {asc: boolean, v: ECompareValueType}[]) {
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

      this.worker.postMessage(<ISortMessageRequest>{
        arr, comparators, rawLength, uid
      });
    });
  }

  terminate() {
    this.worker.terminate();
  }
}
