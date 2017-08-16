import Column from '../model/Column';
import IDOMCellRenderer from './IDOMCellRenderers';
import {ICanvasRenderContext} from './RendererContexts';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IDataRow} from '../provider/ADataProvider';
import {clipText} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';
import {IGroup} from '../model/Group';


export default class LoadingCellRenderer implements ICellRendererFactory {
  createDOM(): IDOMCellRenderer {
    return {
      template: `<div>Loading…</div>`,
      update: () => undefined
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const base = Date.now() % 360;
    return (ctx: CanvasRenderingContext2D, _d: IDataRow, i: number) => {
      clipText(ctx, 'Loading…', 10, 0, context.colWidth(col) - 10, context.textHints);
      const angle = (base + i * 45) * (Math.PI / 180);
      ctx.save();
      ctx.font = '10pt FontAwesome';
      ctx.textAlign = 'center';
      const shift = (context.rowHeight(i) - context.textHints.spinnerWidth) * 0.5;
      ctx.translate(2, shift + context.textHints.spinnerWidth * 0.5);
      ctx.rotate(angle);
      ctx.translate(0, -context.textHints.spinnerWidth * 0.5);
      ctx.fillText('\uf110', 0, 0);
      ctx.restore();
    };
  }

  createGroupSVG(col: Column): ISVGGroupRenderer {
    return {
      template: `<text class='loading'><tspan class='fa'>\uf110</tspan>Loading…</text>`,
      update: () => undefined // TODO svg animation
    };
  }

  createGroupHTML(col: Column): IHTMLGroupRenderer {
    return {
      template: `<div class='loading'><i class='fa fa-spinner fa-pulse'></i><div>Loading…</div></div>`,
      update: () => undefined
    };
  }

  createGroupCanvas(col: Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const base = Date.now() % 360;
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      clipText(ctx, 'Loading…', 10, 0, col.getWidth() - 10, context.textHints);
      const angle = (base) * (Math.PI / 180);
      ctx.save();
      ctx.font = '10pt FontAwesome';
      ctx.textAlign = 'center';
      const shift = (context.groupHeight(group) - context.textHints.spinnerWidth) * 0.5;
      ctx.translate(2, shift + context.textHints.spinnerWidth * 0.5);
      ctx.rotate(angle);
      ctx.translate(0, -context.textHints.spinnerWidth * 0.5);
      ctx.fillText('\uf110', 0, 0);
      ctx.restore();
    };
  }
}
