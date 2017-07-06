import Column from '../model/Column';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer  from './IDOMCellRenderers';
import ICanvasCellRenderer from './ICanvasCellRenderer';

interface ICellRendererFactory {
  createDOM?(col: Column, context: IDOMRenderContext): IDOMCellRenderer;
  createCanvas?(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer;
}

export default ICellRendererFactory;
