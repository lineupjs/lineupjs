/**
 * a set that preserves the insertion order
 */
export default class OrderedSet<T> implements Iterable<T> {
  readonly [Symbol.toStringTag] = Symbol('OrderedSet');
  private readonly set = new Set<T>();
  private readonly list = <T[]>[];

  constructor(values: T[] = []) {
    this.addAll(values);
  }

  get size() {
    return this.set.size;
  }

  clear() {
    this.set.clear();
    this.list.splice(0, this.list.length);
  }

  addAll(values: T[]) {
    values.forEach((v) => this.add(v));
    return this;
  }

  add(value: T) {
    if (this.set.has(value)) {
      return this;
    }
    this.set.add(value);
    this.list.push(value);
    return this;
  }

  has(value: T) {
    return this.set.has(value);
  }

  delete(value: T) {
    const r = this.set.delete(value);
    if (!r) {
      return false;
    }
    const index = this.list.indexOf(value);
    console.assert(index >= 0);
    this.list.splice(index, 1);
    return true;
  }

  deleteAll(values: T[]) {
    return values.reduce((acc, act) => this.delete(act) && acc, true);
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any) {
    this.list.forEach(function (this: any, v: T) {
      callbackfn.call(this, v, v, <any>this);
    }, thisArg);
  }

  [Symbol.iterator]() {
    return this.list[Symbol.iterator]();
  }
}
