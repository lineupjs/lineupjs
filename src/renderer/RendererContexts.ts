import IRenderContext from './IRenderContext';
import {IDOMCellRenderer} from './IDOMCellRenderers';
import {ITextRenderHints} from '../utils';

export declare type IDOMRenderContext = IRenderContext<IDOMCellRenderer<Element>>;

export interface ICanvasRenderContext extends IRenderContext<CanvasRenderingContext2D> {
  hovered(dataIndex: number): boolean;
  selected(dataIndex: number): boolean;
  readonly textHints: ITextRenderHints;
  readonly bodyDOMElement: HTMLElement;
}
