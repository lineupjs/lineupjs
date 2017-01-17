import {IDataRow} from '../provider/ADataProvider';

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
  update(node: T, d: IDataRow, i: number): void;
}

export declare type ISVGCellRenderer = IDOMCellRenderer<SVGElement>;
export declare type IHTMLCellRenderer = IDOMCellRenderer<HTMLElement>;
