import ICellRendererFactory from './ICellRendererFactory';
import StackColumn from '../model/StackColumn';
import IRenderContext from './IRenderContext';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer, IHTMLCellRenderer} from './IDOMCellRenderers';
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
      offset += d.getWidth();
      offset += (!stacked ? padding : 0);
      return {
        column: d,
        shift,
        stacked,
        renderer: context.renderer(d)
      };
    });
  }

  createSVG(col: StackColumn, context: IDOMRenderContext): ISVGCellRenderer {
    const cols = this.createData(col, context);
    return {
      template: `<g class='stack component${context.option('stackLevel', 0)}'>${cols.map((d) => d.renderer.template).join('')}</g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        let stackShift = 0;
        matchColumns(n, cols);
        cols.forEach((col, ci) => {
          const cnode: any = n.childNodes[ci];
          cnode.setAttribute('transform', `translate(${col.shift - stackShift},0)`);
          col.renderer.update(cnode, d, i);
          if (col.stacked) {
            stackShift += col.column.getWidth() * (1 - col.column.getValue(d.v, d.dataIndex));
          }
        });
      }
    };
  }

  createHTML(col: StackColumn, context: IDOMRenderContext): IHTMLCellRenderer {
    const cols = this.createData(col, context);
    return {
      template: `<div class='stack component${context.option('stackLevel', 0)}'>${cols.map((d) => d.renderer.template).join('')}</div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        let stackShift = 0;
        matchColumns(n, cols, 'html');
        cols.forEach((col, ci) => {
          const cnode: any = n.childNodes[ci];
          cnode.style.transform = `translate(${col.shift - stackShift}px,0)`;
          col.renderer.update(cnode, d, i);
          if (col.stacked) {
            stackShift += col.column.getWidth() * (1 - col.column.getValue(d.v, d.dataIndex));
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
          stackShift += col.column.getWidth() * (1 - col.column.getValue(d.v, d.dataIndex));
        }
      });
    };
  }
}
