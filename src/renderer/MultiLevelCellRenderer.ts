import ICellRendererFactory from './ICellRendererFactory';
import StackColumn from '../model/StackColumn';
import IRenderContext, {IImposer} from './IRenderContext';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {matchColumns, round} from '../utils';
import {IGroup} from '../model/Group';
import {AAggregatedGroupRenderer} from './AAggregatedGroupRenderer';
import {IMultiLevelColumn, isMultiLevelColumn} from '../model/CompositeColumn';
import Column from '../model/Column';
import {isEdge} from 'lineupengine/src/style';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {default as INumberColumn, isNumberColumn, medianIndex} from '../model/INumberColumn';

export function gridClass(column: Column) {
  return `lu-stacked-${column.id}`;
}

export function createData(col: {children: Column[]} & Column, context: IRenderContext<any, any>, nestingPossible: boolean, imposer?: IImposer) {
  const stacked = nestingPossible && context.option('stacked', true);
  const padding = context.option('columnPadding', 0);
  let offset = 0;
  const cols = col.children.map((d) => {
    const shift = offset;
    const width = d.getWidth();
    offset += width;
    offset += (!stacked ? padding : 0);
    return {
      column: d,
      shift,
      width,
      renderer: context.renderer(d, imposer),
      groupRenderer: context.groupRenderer(d, imposer)
    };
  });
  return {cols, stacked, padding};
}

/**
 * renders a stacked column using composite pattern
 */
export default class MultiLevelCellRenderer extends AAggregatedGroupRenderer<IMultiLevelColumn & Column> implements ICellRendererFactory {
  readonly title: string;

  constructor(private readonly nestingPossible: boolean = true) {
    super();
    this.title = this.nestingPossible ? 'Stacked Bar' : 'Nested';
  }

  canRender(col: Column) {
    return isMultiLevelColumn(col);
  }

  createDOM(col: IMultiLevelColumn & Column, context: IDOMRenderContext, imposer?: IImposer): IDOMCellRenderer {
    const {cols, stacked, padding} = createData(col, context, this.nestingPossible, imposer);
    const useGrid = context.option('useGridLayout', false);
    return {
      template: `<div class='${col.desc.type} component${context.option('stackLevel', 0)} ${useGrid ? gridClass(col): ''}${useGrid && !stacked ? ' lu-grid-space': ''}'>${cols.map((d) => d.renderer.template).join('')}</div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number, group: IGroup) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        matchColumns(n, cols, 'detail', 'html');

        const children = <HTMLElement[]>Array.from(n.children);
        const total = col.getWidth();
        let missingWeight = 0;
        cols.forEach((col, ci) => {
          const weight = col.column.getWidth() / total;
          const cnode = children[ci];
          cnode.style.transform = stacked ? `translate(-${round((missingWeight / weight) * 100, 4)}%,0)`: null;
          if (!useGrid) {
            cnode.style.width = `${round(weight * 100, 2)}%`;
            cnode.style.marginRight = stacked ? null : `${padding}px`;
          } else if (isEdge) {
            cnode.style.msGridColumn = (ci + 1).toString();
          } else {
            (<any>cnode.style).gridColumnStart = (ci + 1).toString();
          }
          col.renderer.update(cnode, d, i, group);
          if (stacked) {
            missingWeight += (1 - col.column.getValue(d.v, d.dataIndex)) * weight;
          }
        });
      }
    };
  }


  createCanvas(col: StackColumn, context: ICanvasRenderContext, imposer?: IImposer): ICanvasCellRenderer {
    const {cols, stacked} = createData(col, context, this.nestingPossible, imposer);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number, group: IGroup) => {
      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }
      let stackShift = 0;
      cols.forEach((col) => {
        const shift = col.shift - stackShift;
        ctx.translate(shift, 0);
        col.renderer(ctx, d, i, dx + shift, dy, group);
        ctx.translate(-shift, 0);
        if (stacked) {
          stackShift += col.width * (1 - col.column.getValue(d.v, d.dataIndex));
        }
      });
    };
  }

  createGroupDOM(col: IMultiLevelColumn & Column, context: IDOMRenderContext, imposer?: IImposer) {
    if (this.nestingPossible && isNumberColumn(col)) {
      return super.createGroupDOM(col, context, imposer);
    }

    const {cols, padding} = createData(col, context, false, imposer);
    const useGrid = context.option('useGridLayout', false);
    return {
      template: `<div class='${col.desc.type} component${context.option('stackLevel', 0)} ${useGrid ? gridClass(col): ''}${useGrid ? ' lu-grid-space': ''}'>${cols.map((d) => d.groupRenderer.template).join('')}</div>`,
      update: (n: HTMLElement, group: IGroup, rows: IDataRow[]) => {
        matchColumns(n, cols, 'group', 'html');

        const children = <HTMLElement[]>Array.from(n.children);
        const total = col.getWidth();
        cols.forEach((col, ci) => {
          const weight = col.column.getWidth() / total;
          const cnode = children[ci];
          if (!useGrid) {
            cnode.style.width = `${round(weight * 100, 2)}%`;
            cnode.style.marginRight = `${padding}px`;
          } else if (isEdge) {
            cnode.style.msGridColumn = (ci + 1).toString();
          } else {
            (<any>cnode.style).gridColumnStart = (ci + 1).toString();
          }
          col.groupRenderer.update(cnode, group, rows);
        });
      }
    };
  }

  createGroupCanvas(col: IMultiLevelColumn & Column, context: ICanvasRenderContext, imposer?: IImposer) {
    if (this.nestingPossible && isNumberColumn(col)) {
      return super.createGroupCanvas(col, context, imposer);
    }
    const {cols} = createData(col, context, false, imposer);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[], dx: number, dy: number) => {
      cols.forEach((col) => {
        const shift = col.shift;
        ctx.translate(shift, 0);
        col.groupRenderer(ctx, group, rows, dx + shift, dy, group);
        ctx.translate(-shift, 0);
      });
    };
  }

  protected aggregatedIndex(rows: IDataRow[], col: IMultiLevelColumn & Column) {
    console.assert(isNumberColumn(col));
    return medianIndex(rows, (<INumberColumn & Column><any>col));
  }
}
