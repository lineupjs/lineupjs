import Column from '../model/Column';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {IHTMLCellRenderer, ISVGCellRenderer, ISVGGroupRenderer, IHTMLGroupRenderer}  from './IDOMCellRenderers';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';

interface ICellRendererFactory {
  createSVG?(col: Column, context: IDOMRenderContext): ISVGCellRenderer;
  createHTML?(col: Column, context: IDOMRenderContext): IHTMLCellRenderer;
  createCanvas?(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer;

  createGroupSVG?(col: Column, context: IDOMRenderContext): ISVGGroupRenderer;
  createGroupHTML?(col: Column, context: IDOMRenderContext): IHTMLGroupRenderer;
  createGroupCanvas?(col: Column, context: ICanvasRenderContext): ICanvasGroupRenderer;
}

export default ICellRendererFactory;
