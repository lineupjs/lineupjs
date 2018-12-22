/**
 * @internal
 */
export interface IDebounceContext {
  /**
   * aka this
   */
  self: any;
  args: any[];
}

/**
 * create a delayed call, can be called multiple times but only the last one at most delayed by timeToDelay will be executed
 * @param {(...args: any[]) => void} callback the callback to call
 * @param {number} timeToDelay delay the call in milliseconds
 * @param choose optional function to merge call context
 * @return {(...args: any[]) => any} a function that can be called with the same interface as the callback but delayed
 * @internal
 */
export default function debounce(callback: (...args: any[]) => void, timeToDelay = 100, choose?: (current: IDebounceContext, next: IDebounceContext) => IDebounceContext) {
  let tm = -1;
  let ctx: IDebounceContext | null = null;

  return function (this: any, ...args: any[]) {
    if (tm >= 0) {
      clearTimeout(tm);
      tm = -1;
    }

    const next = {self: this, args};
    // compute current context
    ctx = ctx && choose ? choose(ctx, next) : next;

    tm = self.setTimeout(() => {
      console.assert(ctx != null);
      callback.apply(ctx!.self, ctx!.args);
      ctx = null;
    }, timeToDelay);
  };
}
