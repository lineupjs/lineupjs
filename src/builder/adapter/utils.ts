export {equal} from '../../internal/utils';

export function isTypeInstance(clazz: any, superClass: any) {
  let c = clazz;
  while (c && c !== superClass) {
    c = c.__proto__;
  }
  return c === superClass;
}

export function pick<T>(obj: T, keys: (keyof T)[]): Pick<T, keyof T> {
  const r: Pick<T, keyof T> = <any>{};
  keys.forEach((k) => {
    if (obj.hasOwnProperty(k)) {
      r[k] = obj[k];
    }
  });
  return r;
}

export function isSame<T>(current: T, changed: (prop: keyof T) => boolean, props: (keyof T)[]) {
  if (props.every((p) => !changed(p))) {
    return null;
  }
  return pick(current, props);
}
