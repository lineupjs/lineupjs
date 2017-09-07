import ICellRendererFactory from './ICellRendererFactory';
import StackColumn from '../model/StackColumn';
import IRenderContext from './IRenderContext';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {matchColumns, round} from '../utils';
import {medianIndex, renderMissingValue} from './BarCellRenderer';
import {IGroup} from '../model/Group';
import {AAggregatedGroupRenderer} from './AAggregatedGroupRenderer';
import {IMultiLevelColumn} from '../model/CompositeColumn';
import Column from '../model/Column';


export function createData(col: IMultiLevelColumn & Column, context: IRenderContext<any, any>, nestingPossible: boolean) {
  const stacked = nestingPossible && context.option('stacked', true);
  const padding = context.option('columnPadding', 0);
  let offset = 0;
  const total = col.getActualWidth();
  return col.children.map((d) => {
    const shift = offset;
    const width = d.getActualWidth();
    offset += width;
    offset += (!stacked ? padding : 0);
    return {
      column: d,
      shift,
      width,
      stacked,
      weight: width / total,
      renderer: context.renderer(d),
      groupRenderer: context.groupRenderer(d)
    };
  });
}

/**
 * renders a stacked column using composite pattern
 */
export default class MultiLevelCellRenderer extends AAggregatedGroupRenderer<IMultiLevelColumn & Column> implements ICellRendererFactory {
  constructor(private readonly nestingPossible: boolean = true) {
    super();
  }

  createDOM(col: IMultiLevelColumn & Column, context: IDOMRenderContext): IDOMCellRenderer {
    const cols = createData(col, context, this.nestingPossible);
    const padding = context.option('columnPadding', 0);
    return {
      template: `<div class='${col.desc.type} component${context.option('stackLevel', 0)}'>${cols.map((d) => d.renderer.template).join('')}</div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number, group: IGroup) => {
        if (col.isMissing(d.v, d.dataIndex)) {
          // everything is missing or at least a part of it
          n.classList.add('lu-missing');
          return;
        }
        matchColumns(n, cols, 'detail', 'html');
        n.classList.remove('lu-missing');

        const children = <HTMLElement[]>Array.from(n.children);
        let previous = 0;
        cols.forEach((col, ci) => {
          const cnode = children[ci];
          cnode.style.width = `${round(col.weight * 100, 2)}%`;
          cnode.style.marginRight = col.stacked ? null : `${padding}px`;
          cnode.style.marginLeft = col.stacked ? `-${round(previous * 100, 2)}%` : null;
          col.renderer.update(cnode, d, i, group);
          if (col.stacked) {
            previous = col.weight * (1 - col.column.getValue(d.v, d.dataIndex));
          }
        });
      }
    };
  }

  createCanvas(col: StackColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    const cols = createData(col, context, this.nestingPossible);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number, group: IGroup) => {
      if (col.isMissing(d.v, d.dataIndex)) {
        // everything is missing or at least a part of it
        renderMissingValue(ctx, col.getWidth(), context.rowHeight(i));
        return;
      }
      let stackShift = 0;
      cols.forEach((col) => {
        const shift = col.shift - stackShift;
        ctx.translate(shift, 0);
        col.renderer(ctx, d, i, dx + shift, dy, group);
        ctx.translate(-shift, 0);
        if (col.stacked) {
          stackShift += col.width * (1 - col.column.getValue(d.v, d.dataIndex));
        }
      });
    };
  }

  protected aggregatedIndex(rows: IDataRow[], col: StackColumn) {
    return medianIndex(rows, col);
  }
}
