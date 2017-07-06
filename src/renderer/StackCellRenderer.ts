import ICellRendererFactory from './ICellRendererFactory';
import StackColumn from '../model/StackColumn';
import IRenderContext from './IRenderContext';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {matchColumns} from '../utils';

/**
 * renders a stacked column using composite pattern
 */
export default class StackCellRenderer implements ICellRendererFactory {
  constructor(private readonly nestingPossible: boolean = true) {
  }

  private createData(col: StackColumn, context: IRenderContext<any>) {
    const stacked = this.nestingPossible && context.option('stacked', true);
    const padding = context.option('columnPadding', 0);
    let offset = 0;
    return col.children.map((d) => {
      const shift = offset;
      offset += d.getActualWidth();
      offset += (!stacked ? padding : 0);
      return {
        column: d,
        shift,
        stacked,
        renderer: context.renderer(d)
      };
    });
  }

  createDOM(col: StackColumn, context: IDOMRenderContext): IDOMCellRenderer {
    const cols = this.createData(col, context);
    return {
      template: `<div class='${col.desc.type} component${context.option('stackLevel', 0)}'>${cols.map((d) => d.renderer.template).join('')}</div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        matchColumns(n, cols, 'html');
        cols.forEach((col, ci) => {
          const cnode: any = n.childNodes[ci];
          col.renderer.update(cnode, d, i);
          if (col.stacked) {
            cnode.style.marginRight = null;
          }
        });
      }
    };
  }

  createCanvas(col: StackColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    const cols = this.createData(col, context);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number) => {
      let stackShift = 0;
      cols.forEach((col) => {
        const shift = col.shift - stackShift;
        ctx.translate(shift, 0);
        col.renderer(ctx, d, i, dx + shift, dy);
        ctx.translate(-shift, 0);
        if (col.stacked) {
          stackShift += col.column.getActualWidth() * (1 - col.column.getValue(d.v, d.dataIndex));
        }
      });
    };
  }
}
