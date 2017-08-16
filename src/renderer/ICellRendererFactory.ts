import Column from '../model/Column';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {IDOMCellRenderer, IDOMGroupRenderer} from './IDOMCellRenderers';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';

interface ICellRendererFactory {
  createDOM?(col: Column, context: IDOMRenderContext): IDOMCellRenderer;
  createCanvas?(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer;
  createGroupDOM?(col: Column, context: IDOMRenderContext): IDOMGroupRenderer;
  createGroupCanvas?(col: Column, context: ICanvasRenderContext): ICanvasGroupRenderer;
}

export default ICellRendererFactory;
