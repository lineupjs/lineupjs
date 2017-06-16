import Column from '../model/Column';
import {IGroup} from '../model/Group';

/**
 * context for rendering, wrapped as an object for easy extensibility
 */
interface IRenderContext<T, T2> {
  /**
   * the height of a row
   * @param index
   */
  rowHeight(index: number): number;

  /**
   * the height of a group
   * @param group
   */
  groupHeight(group: IGroup): number;

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
   * @param default_ default value
   */
  option<T>(key: string, defaultValue: T): T;
}

export default IRenderContext;
