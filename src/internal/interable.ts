
export interface IForEachAble<T> extends Iterable<T> {
  forEach(callback: (v: T, i: number) => void): void;
}

/**
 * @internal
 */
export function isForEachAble<T>(v: IForEachAble<T> | any): v is IForEachAble<T> {
  return typeof v.forEach === 'function';
}

/**
 * generalized version of Array function similar to Scala ISeq
 */
export interface ISequence<T> extends IForEachAble<T> {
  readonly length: number;
  filter(callback: (v: T, i: number) => boolean): ISequence<T>;
  map<U>(callback: (v: T, i: number) => U): ISequence<U>;

  some(callback: (v: T, i: number) => boolean): boolean;
  every(callback: (v: T, i: number) => boolean): boolean;
  reduce<U>(callback: (acc: U, v: T, i: number) => U, initial: U): U;
}

/**
 * @internal
 */
export function isSeqEmpty(seq: ISequence<any>) {
  return seq.every(() => false); // more efficent than counting length
}

/**
 * helper function for faster access to avoid function calls
 * @internal
 */
export function isIndicesAble<T>(it: Iterable<T>): it is ArrayLike<T> & Iterable<T> {
  return Array.isArray(it) || it instanceof Uint8Array || it instanceof Uint16Array || it instanceof Uint32Array || it instanceof Float32Array || it instanceof Int8Array || it instanceof Int16Array || it instanceof Int32Array || it instanceof Float64Array;
}

declare type ISequenceBase<T> = ISequence<T> | (ArrayLike<T> & Iterable<T>);

/**
 * sequence implementation that does the operation lazily on the fly
 */
class LazyFilter<T> implements ISequence<T> {
  private _length = -1;

  constructor(private readonly it: ISequenceBase<T>, private readonly filters: ((v: T, i: number) => boolean)[]) {

  }

  get length() {
    // cached
    if (this._length >= 0) {
      return this._length;
    }
    let l = 0;
    this.forEach(() => l++);
    this._length = l;
    return l;
  }

  filter(callback: (v: T, i: number) => boolean): ISequence<T> {
    // propagate filter
    return new LazyFilter(this.it, this.filters.concat(callback));
  }

  map<U>(callback: (v: T, i: number) => U): ISequence<U> {
    // create lazy map out of myself
    return new LazyMap1(this, callback);
  }

  forEach(callback: (v: T, i: number) => void) {
    if (isIndicesAble(this.it)) {
      // fast array version
      outer: for (let i = 0; i < this.it.length; ++i) {
        const v = this.it[i];
        for (const f of this.filters) {
          if (!f(v, i)) {
            continue outer;
          }
        }
        callback(v, i);
      }
      return;
    }

    // iterator version
    let valid = 0;
    const it = this.it[Symbol.iterator]();
    let v = it.next();
    let i = 0;
    outer: while (!v.done) {
      for (const f of this.filters) {
        if (f(v.value, i)) {
          continue;
        }
        v = it.next();
        i++;
        continue outer;
      }
      callback(v.value, valid++);
      v = it.next();
      i++;
    }
  }

  [Symbol.iterator]() {
    const it = this.it[Symbol.iterator]();
    const next = () => {
      let v = it.next();
      let i = -1;
      outer: while (!v.done) {
        i++;
        for (const f of this.filters) {
          if (f(v.value, i)) {
            continue;
          }
          // invalid go to next
          v = it.next();
          continue outer;
        }
        return v;
      }
      return v;
    };
    return {next};
  }

  some(callback: (v: T, i: number) => boolean) {
    if (isIndicesAble(this.it)) {
      // fast array version
      outer: for (let i = 0; i < this.it.length; ++i) {
        const v = this.it[i];
        for (const f of this.filters) {
          if (!f(v, i)) {
            continue outer;
          }
        }
        if (callback(v, i)) {
          return true;
        }
      }
      return false;
    }

    let valid = 0;
    const it = this.it[Symbol.iterator]();
    let v = it.next();
    let i = 0;
    outer: while (!v.done) {
      for (const f of this.filters) {
        if (f(v.value, i)) {
          continue;
        }
        v = it.next();
        i++;
        continue outer;
      }
      if (callback(v.value, valid++)) {
        return true;
      }
      v = it.next();
      i++;
    }
    return false;
  }

  every(callback: (v: T, i: number) => boolean) {
    if (isIndicesAble(this.it)) {
      // fast array version
      outer: for (let i = 0; i < this.it.length; ++i) {
        const v = this.it[i];
        for (const f of this.filters) {
          if (!f(v, i)) {
            continue outer;
          }
        }
        if (!callback(v, i)) {
          return false;
        }
      }
      return true;
    }

    let valid = 0;
    const it = this.it[Symbol.iterator]();
    let v = it.next();
    let i = 0;
    outer: while (!v.done) {
      for (const f of this.filters) {
        if (f(v.value, i)) {
          continue;
        }
        v = it.next();
        i++;
        continue outer;
      }
      if (!callback(v.value, valid++)) {
        return false;
      }
      v = it.next();
      i++;
    }
    return true;
  }

  reduce<U>(callback: (acc: U, v: T, i: number) => U, initial: U) {
    if (isIndicesAble(this.it)) {
      // fast array version
      let acc = initial;
      let j = 0;
      outer: for (let i = 0; i < this.it.length; ++i) {
        const v = this.it[i];
        for (const f of this.filters) {
          if (!f(v, i)) {
            continue outer;
          }
        }
        acc = callback(acc, v, j++);
      }
      return acc;
    }

    let valid = 0;
    const it = this.it[Symbol.iterator]();
    let v = it.next();
    let i = 0;
    let r = initial;
    outer: while (!v.done) {
      for (const f of this.filters) {
        if (f(v.value, i)) {
          continue;
        }
        v = it.next();
        i++;
        continue outer;
      }
      r = callback(r, v.value, valid++);
      v = it.next();
      i++;
    }
    return r;
  }
}

/**
 * lazy mapping operation
 */
abstract class ALazyMap<T, T2> implements ISequence<T2> {
  constructor(protected readonly it: ISequenceBase<T>) {

  }

  get length() {
    return this.it.length;
  }

  filter(callback: (v: T2, i: number) => boolean): ISequence<T2> {
    return new LazyFilter(this, [callback]);
  }

  abstract map<U>(callback: (v: T2, i: number) => U): ISequence<U>;
  protected abstract mapV(v: T, i: number): T2;


  forEach(callback: (v: T2, i: number) => void) {
    if (isIndicesAble(this.it)) {
      for (let i = 0; i < this.it.length; ++i) {
        callback(this.mapV(this.it[i], i), i);
      }
      return;
    }
    const it = this.it[Symbol.iterator]();
    for (let v = it.next(), i = 0; !v.done; v = it.next(), i++) {
      callback(this.mapV(v.value, i), i);
    }
  }

  [Symbol.iterator]() {
    const it = this.it[Symbol.iterator]();
    let i = 0;
    const next = () => {
      const v = it.next();
      if (v.done) {
        return {
          value: <T2><any>undefined,
          done: true
        };
      }
      const value = this.mapV(v.value, i);
      i++;
      return {
        value,
        done: false
      };
    };
    return {next};
  }

  some(callback: (v: T2, i: number) => boolean) {
    if (isIndicesAble(this.it)) {
      for (let i = 0; i < this.it.length; ++i) {
        if (callback(this.mapV(this.it[i], i), i)) {
          return true;
        }
      }
      return false;
    }

    const it = this.it[Symbol.iterator]();
    for (let v = it.next(), i = 0; !v.done; v = it.next(), i++) {
      if (callback(this.mapV(v.value, i), i)) {
        return true;
      }
    }
    return false;
  }

  every(callback: (v: T2, i: number) => boolean) {
    if (isIndicesAble(this.it)) {
      for (let i = 0; i < this.it.length; ++i) {
        if (!callback(this.mapV(this.it[i], i), i)) {
          return false;
        }
      }
      return true;
    }

    const it = this.it[Symbol.iterator]();
    for (let v = it.next(), i = 0; !v.done; v = it.next(), i++) {
      if (!callback(this.mapV(v.value, i), i)) {
        return false;
      }
    }
    return true;
  }

  reduce<U>(callback: (acc: U, v: T2, i: number) => U, initial: U) {
    if (isIndicesAble(this.it)) {
      let acc = initial;
      for (let i = 0; i < this.it.length; ++i) {
        acc = callback(acc, this.mapV(this.it[i], i), i);
      }
      return acc;
    }

    const it = this.it[Symbol.iterator]();
    let acc = initial;
    for (let v = it.next(), i = 0; !v.done; v = it.next(), i++) {
      acc = callback(acc, this.mapV(v.value, i), i);
    }
    return acc;
  }
}

class LazyMap1<T1, T2> extends ALazyMap<T1, T2> implements ISequence<T2> {
  constructor(it: ISequenceBase<T1>, protected readonly mapV: (v: T1, i: number) => T2) {
    super(it);
  }

  map<U>(callback: (v: T2, i: number) => U): ISequence<U> {
    return new LazyMap2(this.it, this.mapV, callback);
  }
}

class LazyMap2<T1, T2, T3> extends ALazyMap<T1, T3> implements ISequence<T3> {
  constructor(it: ISequenceBase<T1>, private readonly map12: (v: T1, i: number) => T2, private readonly map23: (v: T2, i: number) => T3) {
    super(it);
  }

  map<U>(callback: (v: T3, i: number) => U): ISequence<U> {
    return new LazyMap3(this.it, this.map12, this.map23, callback);
  }

  protected mapV(v: T1, i: number) {
    return this.map23(this.map12(v, i), i);
  }
}


class LazyMap3<T1, T2, T3, T4> extends ALazyMap<T1, T4> implements ISequence<T4> {
  constructor(it: ISequenceBase<T1>, private readonly map12: (v: T1, i: number) => T2, private readonly map23: (v: T2, i: number) => T3, private readonly map34: (v: T3, i: number) => T4) {
    super(it);
  }

  map<U>(callback: (v: T4, i: number) => U): ISequence<U> {
    const map1U = (v: T1, i: number) => callback(this.map34(this.map23(this.map12(v, i), i), i), i);
    return new LazyMap1(this.it, map1U);
  }

  protected mapV(v: T1, i: number) {
    return this.map34(this.map23(this.map12(v, i), i), i);
  }
}

class LazySeq<T> implements ISequence<T> {
  private _arr: ISequenceBase<T> | null = null;

  constructor(private readonly iterable: Iterable<T>) {

  }

  get arr() {
    if (this._arr) {
      return this._arr;
    }
    if (isIndicesAble(this.iterable)) {
      this._arr = this.iterable;
    } else {
      this._arr = Array.from(this.iterable);
    }
    return this._arr!;
  }

  [Symbol.iterator]() {
    return this.iterable[Symbol.iterator]();
  }

  filter(callback: (v: T, i: number) => boolean) {
    return new LazyFilter(this.arr, [callback]);
  }

  map<U>(callback: (v: T, i: number) => U) {
    return new LazyMap1(this.arr, callback);
  }

  forEach(callback: (v: T, i: number) => void) {
    if (isIndicesAble(this.iterable)) {
      for (let i = 0; i < this.iterable.length; ++i) {
        callback(this.iterable[i], i);
      }
      return;
    }
    const it = this[Symbol.iterator]();
    for (let v = it.next(), i = 0; !v.done; v = it.next(), i++) {
      callback(v.value, i);
    }
  }

  some(callback: (v: T, i: number) => boolean) {
    if (isIndicesAble(this.iterable)) {
      for (let i = 0; i < this.iterable.length; ++i) {
        if (callback(this.iterable[i], i)) {
          return true;
        }
      }
      return false;
    }

    const it = this[Symbol.iterator]();
    for (let v = it.next(), i = 0; !v.done; v = it.next(), i++) {
      if (callback(v.value, i)) {
        return true;
      }
    }
    return false;
  }

  every(callback: (v: T, i: number) => boolean) {
    if (isIndicesAble(this.iterable)) {
      for (let i = 0; i < this.iterable.length; ++i) {
        if (!callback(this.iterable[i], i)) {
          return false;
        }
      }
      return true;
    }

    const it = this[Symbol.iterator]();
    for (let v = it.next(), i = 0; !v.done; v = it.next(), i++) {
      if (!callback(v.value, i)) {
        return false;
      }
    }
    return true;
  }

  reduce<U>(callback: (acc: U, v: T, i: number) => U, initial: U) {
    if (isIndicesAble(this.iterable)) {
      let acc = initial;
      for (let i = 0; i < this.iterable.length; ++i) {
        acc = callback(acc, this.iterable[i], i);
      }
      return acc;
    }

    const it = this[Symbol.iterator]();
    let acc = initial;
    for (let v = it.next(), i = 0; !v.done; v = it.next(), i++) {
      acc = callback(acc, v.value, i);
    }
    return acc;
  }

  get length() {
    const it = this.iterable;
    if (isIndicesAble(it)) {
      return it.length;
    }
    if (it instanceof Set || it instanceof Map) {
      return it.size;
    }
    return this.arr.length;
  }
}

/**
 * @internal
 */
export function lazySeq<T>(iterable: Iterable<T>): ISequence<T> {
  return new LazySeq(iterable);
}


class ConcatSequence<T> implements ISequence<T> {
  constructor(private readonly seqs: ISequence<ISequence<T>>) {
    //
  }

  [Symbol.iterator]() {
    const seqs = Array.from(this.seqs);
    let it = seqs.shift()![Symbol.iterator]();
    const next = (): {value: T, done: boolean} => {
      const v = it.next();
      if (!v.done) {
        return v;
      }
      if (seqs.length === 0) {
        // last last
        return v;
      }
      // next iterator and compute next element
      it = seqs.shift()![Symbol.iterator]();
      return next();
    };
    return {next};
  }

  filter(callback: (v: T, i: number) => boolean): ISequence<T> {
    return new LazyFilter(this, [callback]);
  }

  map<U>(callback: (v: T, i: number) => U): ISequence<U> {
    return new LazyMap1(this, callback);
  }

  forEach(callback: (v: T, i: number) => void) {
    this.seqs.forEach((s) => s.forEach(callback));
  }

  some(callback: (v: T, i: number) => boolean) {
    return this.seqs.some((s) => s.some(callback));
  }

  every(callback: (v: T, i: number) => boolean) {
    return this.seqs.every((s) => s.every(callback));
  }

  reduce<U>(callback: (acc: U, v: T, i: number) => U, initial: U) {
    return this.seqs.reduce((acc, s) => s.reduce(callback, acc), initial);
  }

  get length() {
    return this.seqs.reduce((a, b) => a + b.length, 0);
  }
}

/**
 * @internal
 */
export function concatSeq<T>(seqs: ISequence<ISequence<T>>): ISequence<T>;
export function concatSeq<T>(seq1: ISequence<T>, seq2: ISequence<T>, ...seqs: ISequence<T>[]): ISequence<T>;
export function concatSeq<T>(seq1: ISequence<T>[] | ISequence<T>, seq2?: ISequence<T>, ...seqs: ISequence<T>[]): ISequence<T> {
  if (seq2) {
    return new ConcatSequence([<ISequence<T>>seq1, seq2].concat(seqs));
  }
  return new ConcatSequence(<ISequence<T>[]>seq1);
}
