import Column from '../model/Column';

/**
 * context for rendering, wrapped as an object for easy extensibility
 */
interface IRenderContext<T, T2> {
  /**
   * render a column
   * @param col
   */
  renderer(col: Column): T;

  /**
   * render a column
   * @param col
   */
  groupRenderer(col: Column): T2;

  /**
   * prefix used for all generated id names
   */
  readonly idPrefix: string;

  /**
   * lookup custom options by key
   * @param key key to lookup
   * @param defaultValue default value
   */
  option<T>(key: string, defaultValue: T): T;

  readonly totalNumberOfRows: number;
}

export default IRenderContext;
