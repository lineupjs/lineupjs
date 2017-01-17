import Column from '../model/Column';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {IHTMLCellRenderer, ISVGCellRenderer}  from './IDOMCellRenderers';
import ICanvasCellRenderer from './ICanvasCellRenderer';

interface ICellRendererFactory {
  createSVG?(col: Column, context: IDOMRenderContext): ISVGCellRenderer;
  createHTML?(col: Column, context: IDOMRenderContext): IHTMLCellRenderer;
  createCanvas?(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer;
}

export default ICellRendererFactory;
