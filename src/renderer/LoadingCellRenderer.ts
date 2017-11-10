import Column from '../model/Column';
import {IDOMGroupRenderer} from './IDOMCellRenderers';
import {ICanvasRenderContext} from './RendererContexts';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IDataRow} from '../provider/ADataProvider';
import {clipText} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';
import {IGroup} from '../model/Group';


export default class LoadingCellRenderer implements ICellRendererFactory {
  readonly title = 'Loading';

  canRender() {
    return false; // just direct selection
  }

  createDOM() {
    return {
      template: `<div>Loading…</div>`,
      update: () => undefined
    };
  }

  createCanvas(col: Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const base = Date.now() % 360;
    return (ctx: CanvasRenderingContext2D, _d: IDataRow, i: number) => {
      renderLoading(ctx, base, i, context.rowHeight(i), col, context);
    };
  }

  createGroupDOM(): IDOMGroupRenderer {
    return this.createDOM();
  }

  createGroupCanvas(col: Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const base = Date.now() % 360;
    return (ctx: CanvasRenderingContext2D, group: IGroup) => {
      renderLoading(ctx, base, 0, context.groupHeight(group), col, context);
    };
  }
}

function renderLoading(ctx: CanvasRenderingContext2D, base: number, i: number, height: number, col: Column, context: ICanvasRenderContext) {
  clipText(ctx, 'Loading…', 10, 0, context.colWidth(col) - 10, context.textHints);
  const angle = (base + i * 45) * (Math.PI / 180);
  ctx.save();
  ctx.font = '10pt FontAwesome';
  ctx.textAlign = 'center';
  const shift = (height - context.textHints.spinnerWidth) * 0.5;
  ctx.translate(2, shift + context.textHints.spinnerWidth * 0.5);
  ctx.rotate(angle);
  ctx.translate(0, -context.textHints.spinnerWidth * 0.5);
  ctx.fillText('\uf110', 0, 0);
  ctx.restore();
}
