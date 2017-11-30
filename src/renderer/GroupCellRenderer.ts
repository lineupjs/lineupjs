import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import ICellRendererFactory from './ICellRendererFactory';
import Column from '../model/Column';
import GroupColumn from '../model/GroupColumn';
import {IGroup} from '../model/Group';
import {IDataRow} from '../provider/ADataProvider';
import {clipText} from '../utils';


/**
 * renders a string with additional alignment behavior
 * one instance factory shared among strings
 */
export default class GroupCellRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof GroupColumn;
  }

  createDOM(): IDOMCellRenderer {
    return {
      template: `<div><div></div></div>`,
      update(node: HTMLElement, _row: IDataRow, i: number, group: IGroup) {
        (<HTMLElement>node.firstElementChild!).innerText = i === 0 ? group.name : '';
      }
    };
  }

  createGroupDOM(): IDOMGroupRenderer {
    return {
      template: `<div><div></div></div>`,
      update(node: HTMLElement, group: IGroup, rows: IDataRow[]) {
        (<HTMLElement>node.firstElementChild!).innerText = `${group.name} (${rows.length})`;
      }
    };
  }

  createCanvas(col: GroupColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, _d: IDataRow, i: number, _dx: number, _dy: number, group: IGroup) => {
      if (i === 0) { //just for the first in each group
        clipText(ctx, group.name, 0, 0, context.colWidth(col), context.textHints);
      }
    };
  }

  createGroupCanvas(col: GroupColumn, context: ICanvasRenderContext): ICanvasGroupRenderer {
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      clipText(ctx,`${group.name} (${rows.length})`, 0, 0, context.colWidth(col), context.textHints);
    };
  }
}
