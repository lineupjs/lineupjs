import {DefaultCellRenderer} from './DefaultCellRenderer';
import StringColumn from '../model/StringColumn';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import ICellRendererFactory from './ICellRendererFactory';
import Column from '../model/Column';
import {IDataRow} from '../provider/ADataProvider';
import {IGroup} from '../model/Group';
import {clipText} from '../utils';


/**
 * renders a string with additional alignment behavior
 * one instance factory shared among strings
 */
export default class StringCellRenderer implements ICellRendererFactory {
  private readonly alignments = {
    left: new DefaultCellRenderer(),
    right: new DefaultCellRenderer('text_right', 'right'),
    center: new DefaultCellRenderer('text_center', 'center')
  };
  private readonly alignmentsNotEscape = {
    left: new DefaultCellRenderer('text', 'left', false),
    right: new DefaultCellRenderer('text_right', 'right', false),
    center: new DefaultCellRenderer('text_center', 'center', false)
  };

  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof StringColumn;
  }

  createDOM(col: StringColumn): IDOMCellRenderer {
    return (col.escape ? this.alignments: this.alignmentsNotEscape)[col.alignment || 'left'].createDOM(col);
  }

  createCanvas(col: StringColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (col.escape ? this.alignments: this.alignmentsNotEscape)[col.alignment || 'left'].createCanvas(col, context);
  }

  private static exampleText(col: Column, rows: IDataRow[]) {
    const numExampleRows = 5;
    let examples = rows
      .slice(0, numExampleRows)
      .map((r) => col.getLabel(r.v, r.dataIndex))
      .join(', ');

    if(rows.length > numExampleRows) {
      examples += ', &hellip;';
    }
    return examples;
  }

  createGroupDOM(col: Column): IDOMGroupRenderer {
    return {
      template: `<div class="text"> </div>`,
      update: (n: HTMLDivElement, _group: IGroup, rows: IDataRow[]) => {
        n.innerHTML = `${StringCellRenderer.exampleText(col, rows)}`;
      }
    };
  }

  createGroupCanvas(col: Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const w = context.colWidth(col);
    return (ctx: CanvasRenderingContext2D, _group: IGroup, rows: IDataRow[]) => {
      const bak = ctx.font;
      ctx.font = '8pt "Helvetica Neue", Helvetica, Arial, sans-serif';
      clipText(ctx, StringCellRenderer.exampleText(col, rows), 0, 2, w, context.textHints);
      ctx.font = bak;
    };
  }
}
