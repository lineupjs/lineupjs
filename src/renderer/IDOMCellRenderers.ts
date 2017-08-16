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
   */
  update(node: HTMLElement, d: IDataRow, i: number): void;
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
   * @param rows the data items
   */
  update(node: HTMLElement, group: IGroup, rows: IDataRow[], hist: IStatistics|ICategoricalStatistics): void;
}
