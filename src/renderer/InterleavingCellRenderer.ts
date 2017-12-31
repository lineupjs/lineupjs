import {renderMissingDOM, renderMissingCanvas} from './missing';
import CompositeNumberColumn from '../model/CompositeNumberColumn';
import {createData} from './MultiLevelCellRenderer';
import {Column, IDataRow, IGroup} from '../model';
import {matchColumns} from './utils';
import {ICategoricalStatistics, IStatistics} from '../internal/math';
import {ICellRendererFactory, default as IRenderContext} from './interfaces';
import {CANVAS_HEIGHT} from '../styles';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class InterleavingCellRenderer implements ICellRendererFactory {
  readonly title = 'Interleaved';

  canRender(col: Column) {
    return col instanceof CompositeNumberColumn;
  }

  create(col: CompositeNumberColumn, context: IRenderContext, hist: IStatistics | ICategoricalStatistics | null) {
    const {cols} = createData(col, context, false);
    const width = context.colWidth(col);
    return {
      template: `<div>${cols.map((r) => r.renderer.template).join('')}</div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number, group: IGroup) => {
        const missing = renderMissingDOM(n, col, d);
        if (missing) {
          return;
        }
        matchColumns(n, cols, 'detail', 'html');
        Array.from(n.children).forEach((ni: HTMLElement, j) => {
          cols[j].renderer.update(ni, d, i, group, hist);
        });
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow, _i: number, group: IGroup) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        const rowHeight = CANVAS_HEIGHT;
        const heightI = rowHeight / cols.length;

        ctx.save();
        ctx.scale(1, 1 / cols.length); // scale since internal use the height, too
        cols.forEach((r, i) => {
          r.renderer.render(ctx, d, i, dx, dy + heightI * i, group);
          ctx.translate(0, rowHeight);
        });
        ctx.restore();
      }
    };
  }

  createGroup(col: CompositeNumberColumn, context: IRenderContext, hist: IStatistics | ICategoricalStatistics | null) {
    const {cols} = createData(col, context, false);
    return {
      template: `<div>${cols.map((r) => r.renderer.template).join('')}</div>`,
      update: (n: HTMLElement, group: IGroup, rows: IDataRow[]) => {
        matchColumns(n, cols, 'group', 'html');
        Array.from(n.children).forEach((ni: HTMLElement, j) => {
          cols[j].groupRenderer.update(ni, group, rows, hist);
        });
      }
    };
  }
}
