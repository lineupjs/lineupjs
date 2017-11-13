import {DefaultCellRenderer} from './DefaultCellRenderer';
import StringColumn from '../model/StringColumn';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import ICellRendererFactory from './ICellRendererFactory';
import Column from '../model/Column';


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

  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof StringColumn;
  }

  createDOM(col: StringColumn): IDOMCellRenderer {
    return this.alignments[col.alignment || 'left'].createDOM(col);
  }

  createCanvas(col: StringColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return this.alignments[col.alignment || 'left'].createCanvas(col, context);
  }

  createGroupDOM(col: StringColumn) {
    return this.alignments[col.alignment || 'left'].createGroupDOM(col);
  }

  createGroupCanvas(col: StringColumn, context: ICanvasRenderContext) {
    return this.alignments[col.alignment || 'left'].createGroupCanvas(col, context);
  }
}
