import {ICategoricalStatistics, IStatistics, round} from '../internal';
import {IDataRow, IGroup, IMultiLevelColumn, isMultiLevelColumn} from '../model';
import Column from '../model/Column';
import {medianIndex} from '../model/internal';
import {default as INumberColumn, isNumberColumn} from '../model/INumberColumn';
import {COLUMN_PADDING} from '../styles';
import {AAggregatedGroupRenderer} from './AAggregatedGroupRenderer';
import {default as IRenderContext, ERenderMode, ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {matchColumns} from './utils';

/** @internal */
export function gridClass(column: Column) {
  return `lu-stacked-${column.id}`;
}

/** @internal */
export function createData(col: { children: Column[] } & Column, context: IRenderContext, stacked: boolean, mode: ERenderMode, imposer?: IImposer) {
  const padding = COLUMN_PADDING;
  let offset = 0;
  const cols = col.children.map((d) => {
    const shift = offset;
    const width = d.getWidth();
    offset += width;
    offset += (!stacked ? padding : 0);

    const renderer = mode === ERenderMode.CELL ? context.renderer(d, imposer) : null;
    const groupRenderer = mode === ERenderMode.GROUP ? context.groupRenderer(d, imposer) : null;
    const summaryRenderer = mode === ERenderMode.GROUP ? context.summaryRenderer(d, false, imposer) : null;
    let template: string = '';
    let rendererId: string = '';
    switch (mode) {
      case ERenderMode.CELL:
        template = renderer!.template;
        rendererId = col.getRenderer();
        break;
      case ERenderMode.GROUP:
        template = groupRenderer!.template;
        rendererId = col.getGroupRenderer();
        break;
      case ERenderMode.SUMMARY:
        template = summaryRenderer!.template;
        rendererId = col.getSummaryRenderer();
        break;
    }
    // inject data attributes
    template = template.replace(/^<([^ >]+)([ >])/, `<$1 data-column-id="${d.id}" data-renderer="${rendererId}"$2`);
    return {
      column: d,
      shift,
      width,
      template,
      rendererId,
      renderer,
      groupRenderer,
      summaryRenderer
    };
  });
  return {cols, stacked, padding};
}

/** @internal */
export default class MultiLevelCellRenderer extends AAggregatedGroupRenderer<IMultiLevelColumn & Column> implements ICellRendererFactory {
  readonly title: string;

  constructor(private readonly stacked: boolean = true) {
    super();
    this.title = this.stacked ? 'Stacked Bar' : 'Nested';
  }

  canRender(col: Column, mode: ERenderMode) {
    return isMultiLevelColumn(col) && mode !== ERenderMode.SUMMARY;
  }

  create(col: IMultiLevelColumn & Column, context: IRenderContext, _hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer) {
    const {cols, stacked, padding} = createData(col, context, this.stacked, ERenderMode.CELL, imposer);
    const useGrid = context.option('useGridLayout', false);
    const width = context.colWidth(col);
    return {
      template: `<div class='${useGrid ? gridClass(col) : ''}${useGrid && !stacked ? ' lu-grid-space' : ''}'>${cols.map((d) => d.template).join('')}</div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number, group: IGroup) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        matchColumns(n, cols);

        const children = <HTMLElement[]>Array.from(n.children);
        const total = col.getWidth();
        let missingWeight = 0;
        cols.forEach((col, ci) => {
          const weight = col.column.getWidth() / total;
          const cnode = children[ci];
          cnode.style.transform = stacked ? `translate(-${round((missingWeight / weight) * 100, 4)}%,0)` : null;
          if (!useGrid) {
            cnode.style.width = `${round(weight * 100, 2)}%`;
            cnode.style.marginRight = stacked ? null : `${padding}px`;
          } else {
            (<any>cnode.style).gridColumnStart = (ci + 1).toString();
          }
          col.renderer!.update(cnode, d, i, group);
          if (stacked) {
            missingWeight += (1 - col.column.getValue(d)) * weight;
          }
        });
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, group: IGroup) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        let stackShift = 0;
        cols.forEach((col) => {
          const shift = col.shift - stackShift;
          ctx.translate(shift, 0);
          col.renderer!.render(ctx, d, i, group);
          ctx.translate(-shift, 0);
          if (stacked) {
            stackShift += col.width * (1 - col.column.getValue(d));
          }
        });
      }
    };
  }


  createGroup(col: IMultiLevelColumn & Column, context: IRenderContext, hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer) {
    if (this.stacked && isNumberColumn(col)) {
      return super.createGroup(col, context, hist, imposer);
    }

    const {cols, padding} = createData(col, context, false, ERenderMode.GROUP, imposer);
    const useGrid = context.option('useGridLayout', false);
    return {
      template: `<div class='${useGrid ? gridClass(col) : ''}${useGrid ? ' lu-grid-space' : ''}'>${cols.map((d) => d.template).join('')}</div>`,
      update: (n: HTMLElement, group: IGroup, rows: IDataRow[]) => {
        matchColumns(n, cols);

        const children = <HTMLElement[]>Array.from(n.children);
        const total = col.getWidth();
        cols.forEach((col, ci) => {
          const weight = col.column.getWidth() / total;
          const cnode = children[ci];
          if (!useGrid) {
            cnode.style.width = `${round(weight * 100, 2)}%`;
            cnode.style.marginRight = `${padding}px`;
          } else {
            (<any>cnode.style).gridColumnStart = (ci + 1).toString();
          }
          col.groupRenderer!.update(cnode, group, rows);
        });
      }
    };
  }

  protected aggregatedIndex(rows: IDataRow[], col: IMultiLevelColumn & Column) {
    console.assert(isNumberColumn(col));
    return medianIndex(rows, (<INumberColumn><any>col));
  }
}
