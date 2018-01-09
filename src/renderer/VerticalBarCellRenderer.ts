import {IDataRow} from '../model';
import Column from '../model/Column';
import {DEFAULT_FORMATTER, INumbersColumn, isNumbersColumn} from '../model/INumberColumn';
import NumbersColumn from '../model/NumbersColumn';
import {CANVAS_HEIGHT} from '../styles';
import {ANumbersCellRenderer} from './ANumbersCellRenderer';
import {toHeatMapColor} from './BrightnessCellRenderer';
import IRenderContext, {ERenderMode, ICellRendererFactory, IImposer} from './interfaces';
import {attr, forEachChild, noRenderer} from './utils';

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
      templateRows += `<div style="background-color: white" title=""></div>`;
    }
    return {
      templateRow: templateRows,
      update: (row: HTMLElement, data: number[], item: IDataRow) => {
        const zero = toHeatMapColor(0, item, col, imposer);
        const one = toHeatMapColor(1, item, col, imposer);

        forEachChild(row, (d, i) => {
          const v = data[i];
          const {bottom, height} = VerticalBarCellRenderer.compute(v, threshold, [0, 1]);
          attr(<HTMLElement>d, {
            title: DEFAULT_FORMATTER(v)
          }, {
            'background-color': v < threshold ? zero : one,
            bottom: `${Math.round((100 * bottom) / range)}%`,
            height: `${Math.round((100 * height) / range)}%`
          });
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
