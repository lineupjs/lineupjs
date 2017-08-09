import IRenderContext from './IRenderContext';
import {IDOMCellRenderer} from './IDOMCellRenderers';
import {ITextRenderHints} from '../utils';
import Column from '../model/Column';

export declare type IDOMRenderContext = IRenderContext<IDOMCellRenderer>;

export interface ICanvasRenderContext extends IRenderContext<CanvasRenderingContext2D> {
  /**
   * the height of a row
   * @param index
   */
  rowHeight(index: number): number;

  colWidth(col: Column): number;

  hovered(dataIndex: number): boolean;

  selected(dataIndex: number): boolean;

  readonly textHints: ITextRenderHints;
  readonly bodyDOMElement: HTMLElement;
}
