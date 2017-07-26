import Column from '../model/Column';
import IDOMCellRenderer from './IDOMCellRenderers';
import {ICanvasRenderContext} from './RendererContexts';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {IDataRow} from '../provider/ADataProvider';
import {clipText} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';


export default class LoadingCellRenderer implements ICellRendererFactory {
  createDOM(col: Column): IDOMCellRenderer {
    return {
      template: `<div class='loading'><i class='fa fa-spinner fa-pulse'></i><div>Loading…</div></div>`,
      update: () => undefined
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const base = Date.now() % 360;
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      clipText(ctx, 'Loading…', 10, 0, col.getActualWidth() - 10, context.textHints);
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
}
