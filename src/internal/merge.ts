const TYPE_OBJECT = '[object Object]';

//credits to https://github.com/vladmiller/dextend/blob/master/lib/dextend.js
/**
 * @internal
 * @param args
 * @returns {any}
 */
export default function merge(...args: any[]) {
  let result = null;

  for (const toMerge of args) {
    const keys = Object.keys(toMerge);

    if (result == null) {
      result = toMerge;
      continue;
    }

    for (const keyName of keys) {
      const value = toMerge[keyName];

      //merge just POJOs
      if (Object.prototype.toString.call(value) === TYPE_OBJECT && (Object.getPrototypeOf(value) === Object.prototype)) { //pojo
        if (result[keyName] === undefined) {
          result[keyName] = {};
        }
        result[keyName] = merge(result[keyName], value);
      } else if (Array.isArray(value)) {
        if (result[keyName] === undefined) {
          result[keyName] = [];
        }
        result[keyName] = value.concat(result[keyName]);
      } else {
        result[keyName] = value;
      }
    }
  }

  return result;
}
