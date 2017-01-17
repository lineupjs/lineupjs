import Column from '../model/Column';

/**
 * context for rendering, wrapped as an object for easy extensibility
 */
interface IRenderContext<T> {
  /**
   * the height of a row
   * @param index
   */
  rowHeight(index: number): number;

  /**
   * render a column
   * @param col
   */
  renderer(col: Column): T;

  /**
   * prefix used for all generated id names
   */
  readonly idPrefix: string;

  /**
   * lookup custom options by key
   * @param key key to lookup
   * @param default_ default value
   */
  option<T>(key: string, defaultValue: T): T;
}

export default IRenderContext;
