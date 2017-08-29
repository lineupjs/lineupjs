import ICellRendererFactory from './ICellRendererFactory';
import StackColumn from '../model/StackColumn';
import IRenderContext from './IRenderContext';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {matchColumns} from '../utils';
import {IGroup} from '../model/Group';
import {AAggregatedGroupRenderer} from './AAggregatedGroupRenderer';
import {medianIndex} from './BarCellRenderer';


export function createData(col: StackColumn, context: IRenderContext<any, any>, nestingPossible: boolean) {
  const stacked = nestingPossible && context.option('stacked', true);
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
      renderer: context.renderer(d),
      groupRenderer: context.groupRenderer(d)
    };
  });
}

/**
 * renders a stacked column using composite pattern
 */
export default class StackCellRenderer extends AAggregatedGroupRenderer<StackColumn> implements ICellRendererFactory {
  constructor(private readonly nestingPossible: boolean = true) {
    super();
  }

  createDOM(col: StackColumn, context: IDOMRenderContext): IDOMCellRenderer {
    const cols = createData(col, context, this.nestingPossible);
    return {
      template: `<div class='${col.desc.type} component${context.option('stackLevel', 0)}'>${cols.map((d) => d.renderer.template).join('')}</div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number, group: IGroup) => {
        matchColumns(n, cols, 'detail', 'html');
        cols.forEach((col, ci) => {
          const cnode: any = n.childNodes[ci];
          col.renderer.update(cnode, d, i, group);
          if (col.stacked) {
            cnode.style.marginRight = null;
          }
        });
      }
    };
  }

  createCanvas(col: StackColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    const cols = createData(col, context, this.nestingPossible);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number, group: IGroup) => {
      let stackShift = 0;
      cols.forEach((col) => {
        const shift = col.shift - stackShift;
        ctx.translate(shift, 0);
        col.renderer(ctx, d, i, dx + shift, dy, group);
        ctx.translate(-shift, 0);
        if (col.stacked) {
          stackShift += col.column.getActualWidth() * (1 - col.column.getValue(d.v, d.dataIndex));
        }
      });
    };
  }

  protected aggregatedIndex(rows: IDataRow[], col: StackColumn) {
    return medianIndex(rows, col);
  }
}
