import Column from '../model/Column';
import {IDOMRenderContext, ICanvasRenderContext, ICanvasGroupRenderContext, IDOMGroupRenderContext} from './RendererContexts';
import {IHTMLCellRenderer, ISVGCellRenderer, ISVGGroupRenderer, IHTMLGroupRenderer}  from './IDOMCellRenderers';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';

interface ICellRendererFactory {
  createSVG?(col: Column, context: IDOMRenderContext): ISVGCellRenderer;
  createHTML?(col: Column, context: IDOMRenderContext): IHTMLCellRenderer;
  createCanvas?(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer;
}

export interface IGroupRendererFactory {
  createSVG?(col: Column, context: IDOMGroupRenderContext): ISVGGroupRenderer;
  createHTML?(col: Column, context: IDOMGroupRenderContext): IHTMLGroupRenderer;
  createCanvas?(col: Column, context: ICanvasGroupRenderContext): ICanvasGroupRenderer;
}

export default ICellRendererFactory;
