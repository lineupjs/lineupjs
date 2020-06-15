const TYPE_OBJECT = '[object Object]';

/**
 * deep merge the source object into the target object and return the target object.
 * will concatenate arrays instead of replacing them.
 * @internal
 */
export default function merge<T1, T2>(target: T1, source: T2): T1 | T2 {
  const result: any = target;

  if (!source) {
    return result;
  }

  const bKeys: (keyof T2)[] = <(keyof T2)[]>Object.keys(source);
  if (bKeys.length === 0) {
    return result;
  }

  for (const key of bKeys) {
    const value = source[key];

    //merge just POJOs
    if (Object.prototype.toString.call(value) === TYPE_OBJECT && (Object.getPrototypeOf(value) === Object.prototype)) { //pojo
      if (result[key] == null) {
        result[key] = {};
      }
      result[key] = merge(result[key], value);
    } else if (Array.isArray(value)) {
      if (result[key] == null) {
        result[key] = [];
      }
      result[key] = result[key].concat(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
