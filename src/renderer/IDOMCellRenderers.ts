import {IDataRow} from '../provider/ADataProvider';
import {IGroup} from '../model/Group';
import {ICategoricalStatistics, IStatistics} from '../model/Column';

/**
 * a cell renderer for rendering a cell of specific column
 */
export interface IDOMCellRenderer {
  /**
   * template as a basis for the update
   */
  readonly template: string;

  /**
   * update a given node (create using the template) with the given data
   * @param node the node to update
   * @param d the data item
   * @param i the order relative index
   * @param group the group this row is part of
   * @param hist the optional histogram of the whole column
   */
  update(node: HTMLElement, d: IDataRow, i: number, group: IGroup, hist: IStatistics | ICategoricalStatistics | null): void;
}

export default IDOMCellRenderer;

/**
 * a cell renderer for rendering a cell of specific column
 */
export interface IDOMGroupRenderer {
  /**
   * template as a basis for the update
   */
  readonly template: string;

  /**
   * update a given node (create using the template) with the given data
   * @param node the node to update
   * @param group the group to render
   * @param hist the optional histogram of the whole column
   * @param rows the data items
   */
  update(node: HTMLElement, group: IGroup, rows: IDataRow[], hist: IStatistics | ICategoricalStatistics | null): void;
}
