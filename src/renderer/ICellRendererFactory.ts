import Column from '../model/Column';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {IHTMLCellRenderer, IHTMLGroupRenderer}  from './IDOMCellRenderers';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';

interface ICellRendererFactory {
  createDOM?(col: Column, context: IDOMRenderContext): IDOMCellRenderer;

  createCanvas?(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer;
  createGroupHTML?(col: Column, context: IDOMRenderContext): IHTMLGroupRenderer;
  createGroupCanvas?(col: Column, context: ICanvasRenderContext): ICanvasGroupRenderer;
}

export default ICellRendererFactory;
