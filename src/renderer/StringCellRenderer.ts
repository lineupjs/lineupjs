import {DefaultCellRenderer} from './DefaultCellRenderer';
import StringColumn from '../model/StringColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import ICellRendererFactory from './ICellRendererFactory';


/**
 * renders a string with additional alignment behavior
 * one instance factory shared among strings
 */
export default class StringCellRenderer implements ICellRendererFactory {
  private alignments = {
    left: new DefaultCellRenderer(),
    right: new DefaultCellRenderer('text_right', 'right'),
    center: new DefaultCellRenderer('text_center', 'center')
  };

  createDOM(col: StringColumn, context: IDOMRenderContext): IDOMCellRenderer {
    return this.alignments[col.alignment].createDOM(col, context);
  }

  createCanvas(col: StringColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return this.alignments[col.alignment].createCanvas(col, context);
  }
}
