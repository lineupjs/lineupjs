import IRenderContext from './IRenderContext';
import {IDOMCellRenderer, IDOMGroupRenderer} from './IDOMCellRenderers';
import {ITextRenderHints} from '../utils';
import Column from '../model/Column';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';

export declare type IDOMRenderContext = IRenderContext<IDOMCellRenderer>;

export interface ICanvasRenderContext extends IRenderContext<ICanvasCellRenderer, ICanvasGroupRenderer> {
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
