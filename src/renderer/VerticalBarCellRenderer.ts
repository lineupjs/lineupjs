import {Column, NumbersColumn, IDataRow, INumbersColumn, isNumbersColumn} from '../model';
import {CANVAS_HEIGHT, cssClass} from '../styles';
import {ANumbersCellRenderer} from './ANumbersCellRenderer';
import {toHeatMapColor} from './BrightnessCellRenderer';
import {IRenderContext, ERenderMode, ICellRendererFactory, IImposer} from './interfaces';
import { forEachChild, noRenderer} from './utils';

/** @internal */
export default class VerticalBarCellRenderer extends ANumbersCellRenderer implements ICellRendererFactory {
  readonly title = 'Bar Chart';

  canRender(col: Column, mode: ERenderMode) {
    return isNumbersColumn(col) && Boolean(col.dataLength) && mode === ERenderMode.CELL;
  }

  private static compute(v: number, threshold: number, domain: number[]) {
    if (v < threshold) {
      //threshold to down
      return {height: (threshold - v), bottom: (v - domain[0])};
    }
    //from top to down
    return {height: (v - threshold), bottom: (threshold - domain[0])};
  }

  protected createContext(col: INumbersColumn, context: IRenderContext, imposer?: IImposer) {
    const cellDimension = context.colWidth(col) / col.dataLength!;
    const threshold = col.getMapping().apply(NumbersColumn.CENTER);
    const range = 1;
    let templateRows = '';
    for (let i = 0; i < col.dataLength!; ++i) {
      templateRows += `<div class="${cssClass('heatmap-cell')}" style="background-color: white" title=""></div>`;
    }
    const formatter = col.getNumberFormat();

    return {
      clazz: cssClass('heatmap'),
      templateRow: templateRows,
      update: (row: HTMLElement, data: number[], raw: number[], item: IDataRow) => {
        const zero = toHeatMapColor(0, item, col, imposer);
        const one = toHeatMapColor(1, item, col, imposer);

        forEachChild(row, (d: HTMLElement, i) => {
          const v = data[i];
          const {bottom, height} = VerticalBarCellRenderer.compute(v, threshold, [0, 1]);
          d.title = formatter(raw[i]);
          d.style.backgroundColor = v < threshold ? zero : one;
          d.style.bottom = `${Math.round((100 * bottom) / range)}%`;
          d.style.height = `${Math.round((100 * height) / range)}%`;
        });
      },
      render: (ctx: CanvasRenderingContext2D, data: number[], item: IDataRow) => {
        const zero = toHeatMapColor(0, item, col, imposer);
        const one = toHeatMapColor(1, item, col, imposer);
        const scale = CANVAS_HEIGHT / range;
        data.forEach((v, j) => {
          ctx.fillStyle = v < threshold ? zero : one;
          const xpos = (j * cellDimension);
          const {bottom, height} = VerticalBarCellRenderer.compute(v, threshold, [0, 1]);
          ctx.fillRect(xpos, (range - height - bottom) * scale, cellDimension, height * scale);
        });
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
