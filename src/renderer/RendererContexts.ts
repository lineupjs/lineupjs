import IRenderContext from './IRenderContext';
import {IDOMCellRenderer, IDOMGroupRenderer} from './IDOMCellRenderers';
import {ITextRenderHints} from '../utils';
import Column from '../model/Column';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IGroup} from '../model/Group';

export declare type IDOMRenderContext = IRenderContext<IDOMCellRenderer, IDOMGroupRenderer>;

export interface ICanvasRenderContext extends IRenderContext<ICanvasCellRenderer, ICanvasGroupRenderer> {
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

  colWidth(col: Column): number;

  hovered(dataIndex: number): boolean;

  groupHovered(group: IGroup): boolean;

  selected(dataIndex: number): boolean;

  readonly textHints: ITextRenderHints;
  readonly bodyDOMElement: HTMLElement;
}
