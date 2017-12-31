import {Column, IDataRow, IGroup} from '../model';
import CompositeNumberColumn from '../model/CompositeNumberColumn';
import {CANVAS_HEIGHT} from '../styles';
import {default as IRenderContext, ICellRendererFactory} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {createData} from './MultiLevelCellRenderer';
import {matchColumns} from './utils';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class InterleavingCellRenderer implements ICellRendererFactory {
  readonly title = 'Interleaved';

  canRender(col: Column) {
    return col instanceof CompositeNumberColumn;
  }

  create(col: CompositeNumberColumn, context: IRenderContext) {
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
          cols[j].renderer.update(ni, d, i, group);
        });
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow, _i: number, group: IGroup) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }

        ctx.save();
        ctx.scale(1, 1 / cols.length); // scale since internal use the height, too
        cols.forEach((r, i) => {
          r.renderer.render(ctx, d, i, group);
          ctx.translate(0, CANVAS_HEIGHT);
        });
        ctx.restore();
      }
    };
  }

  createGroup(col: CompositeNumberColumn, context: IRenderContext) {
    const {cols} = createData(col, context, false);
    return {
      template: `<div>${cols.map((r) => r.renderer.template).join('')}</div>`,
      update: (n: HTMLElement, group: IGroup, rows: IDataRow[]) => {
        matchColumns(n, cols, 'group', 'html');
        Array.from(n.children).forEach((ni: HTMLElement, j) => {
          cols[j].groupRenderer.update(ni, group, rows);
        });
      }
    };
  }
}
