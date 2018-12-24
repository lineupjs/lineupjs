
/** @internal */
export function equalArrays<T>(a: T[], b: T[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((ai, i) => ai === b[i]);
}


/**
 * converts a given id to css compatible one
 * @param id
 * @return {string|void}
 * @internal
 */
export function fixCSS(id: string) {
  return id.replace(/[\s!#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]+/g, '_'); //replace non css stuff to _
}

/**
 * clear node clearing
 * @param node
 * @internal
 */
export function clear<T extends Node>(node: T) {
  while (node.lastChild) {
    node.removeChild(node.lastChild);
  }
  return node;
}

/**
 * @internal
 * to avoid [].concat(...) which doesn't work for large arrays
 * @param arrs
 */
export function concat<T>(arrs: (T[] | T)[]): T[] {
  const r: T[] = [];
  for (const a of arrs) {
    if (!Array.isArray(a)) {
      r.push(a);
      continue;
    }
    for (const ai of a) {
      r.push(ai);
    }
  }
  return r;
}
