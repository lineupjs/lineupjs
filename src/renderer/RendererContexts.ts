import IRenderContext from './IRenderContext';
import {IDOMCellRenderer, IDOMGroupRenderer} from './IDOMCellRenderers';
import {ITextRenderHints} from '../utils';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';

export declare type IDOMRenderContext = IRenderContext<IDOMCellRenderer<Element>, IDOMGroupRenderer<Element>>;

export interface ICanvasRenderContext extends IRenderContext<ICanvasCellRenderer, ICanvasGroupRenderer> {
  hovered(dataIndex: number): boolean;
  selected(dataIndex: number): boolean;
  readonly textHints: ITextRenderHints;
  readonly bodyDOMElement: HTMLElement;
}
