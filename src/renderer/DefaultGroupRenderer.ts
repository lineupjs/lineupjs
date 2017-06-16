import {IGroupRendererFactory} from './ICellRendererFactory';
import Column from '../model/Column';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import {ISVGGroupRenderer, IHTMLGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {IGroup} from '../model/Group';
import {attr, clipText} from '../utils';
import {ICanvasGroupRenderer} from './ICanvasCellRenderer';


export default class DefaultGroupRenderer implements IGroupRendererFactory {

  createSVG(col: Column, context: IDOMRenderContext): ISVGGroupRenderer {
    return {
      template: `<text class="text_center"></text>`,
      update: (n: SVGGElement, group: IGroup, rows: IDataRow[]) => {
        n.textContent = `${group.name} (${rows.length})`;
        attr(n, {
          x: col.getWidth() / 2,
          y: context.groupHeight(group) / 2
        });
      }
    };
  }

  createHTML(col: Column, context: IDOMRenderContext): IHTMLGroupRenderer {
    return {
      template: `<div class="text_center"></div>`,
      update: (n: HTMLDivElement, group: IGroup, rows: IDataRow[]) => {
        n.textContent = `${group.name} (${rows.length})`;
        n.style.height = (context.groupHeight(group) / 2) + 'px';
      }
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const w = col.getWidth();
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      const bak = ctx.textAlign;
      ctx.textAlign = 'center';
      const shift = w / 2;
      clipText(ctx, `${group.name} (${rows.length})`, shift, 0, w, context.textHints);
      ctx.textAlign = bak;
    };
  }
}
