import SelectionColumn from '../model/SelectionColumn';
import {ISVGCellRenderer, IHTMLCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {ICanvasRenderContext} from './RendererContexts';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {clipText} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';
import {IGroup} from '../model/Group';

export default class SelectionRenderer implements ICellRendererFactory {
  createSVG(col: SelectionColumn): ISVGCellRenderer {
    return {
      template: `<text class='selection fa'><tspan class='selectionOnly'>\uf046</tspan><tspan class='notSelectionOnly'>\uf096</tspan></text>`,
      update: (n: SVGGElement, d: IDataRow) => {
        n.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          col.toggleValue(d.v, d.dataIndex);
        };
      }
    };
  }

  createHTML(col: SelectionColumn): IHTMLCellRenderer {
    return {
      template: `<div class='selection fa'></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        n.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          col.toggleValue(d.v, d.dataIndex);
        };
      }
    };
  }

  createCanvas(col: SelectionColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow) => {
      const bak = ctx.font;
      ctx.font = '10pt FontAwesome';
      clipText(ctx, col.getValue(d.v, d.dataIndex) ? '\uf046' : '\uf096', 0, 0, col.getWidth(), context.textHints);
      ctx.font = bak;
    };
  }

  createGroupCanvas(col: SelectionColumn, context: ICanvasRenderContext): ICanvasGroupRenderer {
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      const selected = rows.reduce((act, r) => col.getValue(r.v, r.dataIndex) ? act + 1 : act, 0);
      clipText(ctx, String(selected), 0, context.groupHeight(group), col.getWidth(), context.textHints);
    };
  }
}
