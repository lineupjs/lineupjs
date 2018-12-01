

export interface ISequence<T> extends Iterable<T> {
  readonly length: number;
  filter(callback: (v: T, i: number) => boolean): ISequence<T>;
  map<U>(callback: (v: T, i: number) => U): ISequence<U>;
  forEach(callback: (v: T, i: number) => void): void;

  some(callback: (v: T, i: number) => boolean): boolean;
  every(callback: (v: T, i: number) => boolean): boolean;
  reduce<U>(callback: (acc: U, v: T, i: number) => U, initial: U): U;
}

export function isSeqEmpty(seq: ISequence<any>) {
  return seq.every(() => false); // more efficent than counting length
}

class LazyFilter<T> implements ISequence<T> {
  private _length = -1;
  constructor(private readonly it: ISequence<T>, private readonly filters: ((v: T, i: number) => boolean)[]) {

  }

  get length() {
    if (this._length >= 0) {
      return this._length;
    }
    let l = 0;
    this.forEach(() => l++);
    this._length = l;
    return l;
  }

  filter(callback: (v: T, i: number) => boolean): ISequence<T> {
    return new LazyFilter(this.it, this.filters.concat(callback));
  }

  map<U>(callback: (v: T, i: number) => U): ISequence<U> {
    return new LazyMap1(this, callback);
  }

  forEach(callback: (v: T, i: number) => void) {
    if (Array.isArray(this.it)) {
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
    if (Array.isArray(this.it)) {
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
    if (Array.isArray(this.it)) {
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
    if (Array.isArray(this.it)) {
      // fast array version
      return this.it.reduce((acc, v, i) => {
        for (const f of this.filters) {
          if (!f(v, i)) {
            return acc;
          }
        }
        return callback(acc, v, i);
      }, initial);
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

abstract class ALazyMap<T, T2> implements ISequence<T2> {
  constructor(protected readonly it: ISequence<T>) {

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
    if (Array.isArray(this.it)) {
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
    if (Array.isArray(this.it)) {
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
    if (Array.isArray(this.it)) {
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
    if (Array.isArray(this.it)) {
      return this.it.reduce((acc, v, i) => callback(acc, this.mapV(v, i), i), initial);
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
  constructor(it: ISequence<T1>, protected readonly mapV: (v: T1, i: number) => T2) {
    super(it);
  }

  map<U>(callback: (v: T2, i: number) => U): ISequence<U> {
    return new LazyMap2(this.it, this.mapV, callback);
  }
}

class LazyMap2<T1, T2, T3> extends ALazyMap<T1, T3> implements ISequence<T3> {
  constructor(it: ISequence<T1>, private readonly map12: (v: T1, i: number) => T2, private readonly map23: (v: T2, i: number) => T3) {
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
  constructor(it: ISequence<T1>, private readonly map12: (v: T1, i: number) => T2, private readonly map23: (v: T2, i: number) => T3, private readonly map34: (v: T3, i: number) => T4) {
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

export function lazySeq<T>(iterable: Iterable<T>): ISequence<T> {
  let v: ReadonlyArray<T> | null = null;
  const asArr = () => {
    if (v) {
      return v;
    }
    if (Array.isArray(iterable)) {
      v = iterable;
    } else {
      v = Array.from(iterable);
    }
    return v!;
  };

  const r: any = {
    [Symbol.iterator]() {
      return iterable[Symbol.iterator]();
    },
    filter(callback: (v: T, i: number) => boolean) {
      return new LazyFilter(asArr(), [callback]);
    },
    map<U>(callback: (v: T, i: number) => U) {
      return new LazyMap1(asArr(), callback);
    },
    forEach(callback: (v: T, i: number) => void) {
      if (Array.isArray(iterable)) {
        for (let i = 0; i < iterable.length; ++i) {
          callback(iterable[i], i);
        }
        return;
      }
      const it = this[Symbol.iterator]();
      for (let v = it.next(), i = 0; !v.done; v = it.next(), i++) {
        callback(v.value, i);
      }
    },
    some(callback: (v: T, i: number) => boolean) {
      if (Array.isArray(iterable)) {
        for (let i = 0; i < iterable.length; ++i) {
          if (callback(iterable[i], i)) {
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
    },
    every(callback: (v: T, i: number) => boolean) {
      if (Array.isArray(iterable)) {
        for (let i = 0; i < iterable.length; ++i) {
          if (!callback(iterable[i], i)) {
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
    },
    reduce<U>(callback: (acc: U, v: T, i: number) => U, initial: U) {
      if (Array.isArray(iterable)) {
        return iterable.reduce(callback);
      }

      const it = this[Symbol.iterator]();
      let acc = initial;
      for (let v = it.next(), i = 0; !v.done; v = it.next(), i++) {
        acc = callback(acc, v.value, i);
      }
      return acc;
    },
  };

  Object.defineProperty(r, 'length', {
    enumerable: true,
    get() {
      if (Array.isArray(iterable)) {
        return iterable.length;
      }
      if (iterable instanceof Set || iterable instanceof Map) {
        return iterable.size;
      }
      return asArr().length;
    }
  });

  return <ISequence<T>><any>r;
}
