

export interface IIterable<T> extends Iterable<T> {
  readonly length: number;
  filter(callback: (v: T, i: number) =>  boolean): IIterable<T>;
  map<U>(callback: (v: T, i: number) => U): IIterable<U>;
  forEach(callback: (v: T, i: number) => void): void;
}

class LazyFilter<T> implements IIterable<T> {
  private _length = -1;
  constructor(private readonly it: IIterable<T>, private readonly filters: ((v: T, i: number) => boolean)[]) {

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

  filter(callback: (v: T, i: number) =>  boolean): IIterable<T> {
    return new LazyFilter(this.it, this.filters.concat(callback));
  }

  map<U>(callback: (v: T, i: number) => U): IIterable<U> {
    return new LazyMap1(this, callback);
  }

  forEach(callback: (v: T, i: number) => void) {
    let i = 0;
    this.it.forEach((v) => {
      for (const f of this.filters) {
        if (!f(v, i)) {
          return;
        }
      }
      callback(v, i++);
    });
  }

  [Symbol.iterator]() {
    const it = this.it[Symbol.iterator]();
    const next = () => {
      let v = it.next();
      let i = 0;
      outer: while (!v.done) {
        for (const f of this.filters) {
          if (f(v.value, i)) {
            continue;
          }
          // invalid go to next
          v = it.next();
          i++;
          continue outer;
        }
      }
      return v;
    };
    return { next };
  }
}

class LazyMap1<T1, T2> implements IIterable<T2> {
  constructor(private readonly it: IIterable<T1>, private readonly map12: (v: T1, i: number) => T2) {

  }

  get length() {
    return this.it.length;
  }

  filter(callback: (v: T2, i: number) =>  boolean): IIterable<T2> {
    return new LazyFilter(this, [callback]);
  }

  map<U>(callback: (v: T2, i: number) => U): IIterable<U> {
    return new LazyMap2(this.it, this.map12, callback);
  }

  forEach(callback: (v: T2, i: number) => void) {
    this.it.forEach((v, i) => {
      callback(this.map12(v, i), i);
    });
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
      const value = this.map12(v.value, ++i);
      i++;
      return {
        value,
        done: false
      };
    };
    return { next };
  }
}

class LazyMap2<T, T2, T3> implements IIterable<T3> {
  constructor(private readonly it: IIterable<T>, private readonly map12: (v: T, i: number) => T2, private readonly map23: (v: T2, i: number) => T3) {

  }

  get length() {
    return this.it.length;
  }

  filter(callback: (v: T3, i: number) =>  boolean): IIterable<T3> {
    return new LazyFilter(this, [callback]);
  }

  map<U>(callback: (v: T3, i: number) => U): IIterable<U> {
    return new LazyMap3(this.it, this.map12, this.map23, callback);
  }

  forEach(callback: (v: T3, i: number) => void) {
    this.it.forEach((v, i) => {
      callback(this.map23(this.map12(v, i), i), i);
    });
  }

  [Symbol.iterator]() {
    const it = this.it[Symbol.iterator]();
    let i = 0;
    const next = () => {
      const v = it.next();
      if (v.done) {
        return {
          value: <T3><any>undefined,
          done: true
        };
      }
      const value = this.map23(this.map12(v.value, i), i);
      i++;
      return {
        value,
        done: false
      };
    };
    return { next };
  }
}


class LazyMap3<T1, T2, T3, T4> implements IIterable<T4> {
  constructor(private readonly it: IIterable<T1>, private readonly map12: (v: T1, i: number) => T2, private readonly map23: (v: T2, i: number) => T3, private readonly map34: (v: T3, i: number) => T4) {

  }

  get length() {
    return this.it.length;
  }

  filter(callback: (v: T4, i: number) =>  boolean): IIterable<T4> {
    return new LazyFilter(this, [callback]);
  }

  map<U>(callback: (v: T4, i: number) => U): IIterable<U> {
    const map1U = (v: T1, i: number) => callback(this.map34(this.map23(this.map12(v, i), i), i), i);
    return new LazyMap1(this.it, map1U);
  }

  forEach(callback: (v: T4, i: number) => void) {
    this.it.forEach((v, i) => {
      callback(this.map34(this.map23(this.map12(v, i), i), i), i);
    });
  }

  [Symbol.iterator]() {
    const it = this.it[Symbol.iterator]();
    let i = 0;
    const next = () => {
      const v = it.next();
      if (v.done) {
        return {
          value: <T4><any>undefined,
          done: true
        };
      }
      i++;
      const value = this.map34(this.map23(this.map12(v.value, i), i), i);
      return {
        value,
        done: false
      };
    };
    return { next };
  }
}

export function lazy<T>(it: Iterable<T>): IIterable<T> {
  let v: ReadonlyArray<T> | null = null;
  const asArr = () => {
    if (v) {
      return v;
    }
    if (Array.isArray(it)) {
      v = it;
    } else {
      v = Array.from(it);
    }
    return v;
  };

  const r: any = {
    [Symbol.iterator]() {
      return it[Symbol.iterator]();
    },
    filter(cb: (v: T, i: number) => boolean) {
      return new LazyFilter(asArr(), [cb]);
    },
    map<U>(cb: (v: T, i: number) => U) {
      return new LazyMap1(asArr(), cb);
    },
    forEach(cb: (v: T, i: number) => void) {
      let i = 0;
      for (const v of asArr()) {
        cb(v, i++);
      }
    }
  };

  Object.defineProperty(r, 'length', {
    enumerable: true,
    writable: false,
    get() {
      return asArr().length;
    }
  });

  return <IIterable<T>><any>r;
}
