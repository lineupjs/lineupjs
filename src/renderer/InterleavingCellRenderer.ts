import ICellRendererFactory from './ICellRendererFactory';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import {renderMissingDOM, renderMissingCanvas} from './missing';
import CompositeNumberColumn from '../model/CompositeNumberColumn';
import {createData} from './MultiLevelCellRenderer';
import {IDataRow} from '../provider/ADataProvider';
import Column, {ICategoricalStatistics, IStatistics} from '../model/Column';
import {IGroup} from '../model/Group';
import {matchColumns} from '../utils';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class InterleavingCellRenderer implements ICellRendererFactory {
  readonly title = 'Interleaved';

  canRender(col: Column) {
    return col instanceof CompositeNumberColumn;
  }

  createDOM(col: CompositeNumberColumn, context: IDOMRenderContext): IDOMCellRenderer {
    const {cols} = createData(col, context, false);
    return {
      template: `<div>${cols.map((r) => r.renderer.template).join('')}</div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number, group: IGroup, hist: IStatistics | ICategoricalStatistics | null) => {
        const missing = renderMissingDOM(n, col, d);
        if (missing) {
          return;
        }
        matchColumns(n, cols, 'detail', 'html');
        Array.from(n.children).forEach((ni: HTMLElement, j) => {
          cols[j].renderer.update(ni, d, i, group, hist);
        });
      }
    };
  }

  createGroupDOM(col: CompositeNumberColumn, context: IDOMRenderContext): IDOMGroupRenderer {
    const {cols} = createData(col, context, false);
    return {
      template: `<div>${cols.map((r) => r.renderer.template).join('')}</div>`,
      update: (n: HTMLElement, group: IGroup, rows: IDataRow[], hist: IStatistics | ICategoricalStatistics | null) => {
        matchColumns(n, cols, 'group', 'html');
        Array.from(n.children).forEach((ni: HTMLElement, j) => {
          cols[j].groupRenderer.update(ni, group, rows, hist);
        });
      }
    };
  }

  createCanvas(col: CompositeNumberColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    const children = col.children;
    const renderers = children.map((c) => context.renderer(c));

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number, group: IGroup, hist: IStatistics | ICategoricalStatistics | null) => {
      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }
      const rowHeight = context.rowHeight(i);
      const heightI = rowHeight / children.length;

      ctx.save();
      ctx.scale(1, 1 / children.length); // scale since internal use the height, too
      renderers.forEach((r, i) => {
        r(ctx, d, i, dx, dy + heightI * i, group, hist);
        ctx.translate(0, rowHeight);
      });
      ctx.restore();
    };
  }

  createGroupCanvas(col: CompositeNumberColumn, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const children = col.children;
    const renderers = children.map((c) => context.groupRenderer(c));

    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[], dx: number, dy: number, hist: IStatistics | ICategoricalStatistics | null) => {
      const rowHeight = context.groupHeight(group);
      const heightI = rowHeight / children.length;

      ctx.save();
      ctx.scale(1, 1 / children.length); // scale since internal use the height, too
      renderers.forEach((r, i) => {
        r(ctx, group, rows, dx, dy + heightI * i, hist);
        ctx.translate(0, rowHeight);
      });
      ctx.restore();
    };
  }
}
