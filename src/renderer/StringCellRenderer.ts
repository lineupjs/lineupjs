import {DefaultCellRenderer} from './DefaultCellRenderer';
import StringColumn from '../model/StringColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer, IHTMLCellRenderer} from './IDOMCellRenderers';
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

  createSVG(col: StringColumn, context: IDOMRenderContext): ISVGCellRenderer {
    return this.alignments[col.alignment].createSVG(col, context);
  }

  createHTML(col: StringColumn, context: IDOMRenderContext): IHTMLCellRenderer {
    return this.alignments[col.alignment].createHTML(col, context);
  }

  createCanvas(col: StringColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return this.alignments[col.alignment].createCanvas(col, context);
  }
}
