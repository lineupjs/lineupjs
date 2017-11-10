import Column from '../model/Column';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import {IDOMCellRenderer, IDOMGroupRenderer} from './IDOMCellRenderers';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';

interface ICellRendererFactory {
  readonly title: string;
  readonly groupTitle?: string;

  canRender(col: Column, asGroup: boolean): boolean;

  createDOM?(col: Column, context: IDOMRenderContext): IDOMCellRenderer;

  createCanvas?(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer;

  createGroupDOM?(col: Column, context: IDOMRenderContext): IDOMGroupRenderer;

  createGroupCanvas?(col: Column, context: ICanvasRenderContext): ICanvasGroupRenderer;
}

export default ICellRendererFactory;
