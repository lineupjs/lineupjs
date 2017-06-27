import {IDataRow} from '../provider/ADataProvider';
import {IGroup} from '../model/Group';
import {ICategoricalStatistics, IStatistics} from '../model/Column';

/**
 * a cell renderer for rendering a cell of specific column
 */
export interface IDOMCellRenderer<T> {
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
  update(node: T, d: IDataRow, i: number, group: IGroup): void;
}

export declare type ISVGCellRenderer = IDOMCellRenderer<SVGElement>;
export declare type IHTMLCellRenderer = IDOMCellRenderer<HTMLElement>;


/**
 * a cell renderer for rendering a cell of specific column
 */
export interface IDOMGroupRenderer<T> {
  /**
   * template as a basis for the update
   */
  readonly template: string;
  /**
   * update a given node (create using the template) with the given data
   * @param node the node to update
   * @param rows the data items
   */
  update(node: T, group: IGroup, rows: IDataRow[], hist: IStatistics|ICategoricalStatistics): void;
}

export declare type ISVGGroupRenderer = IDOMGroupRenderer<SVGElement>;
export declare type IHTMLGroupRenderer = IDOMGroupRenderer<HTMLElement>;
