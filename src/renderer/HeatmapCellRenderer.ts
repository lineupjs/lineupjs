import {IDataRow, isMissingValue} from '../model';
import Column from '../model/Column';
import {DEFAULT_FORMATTER, INumbersColumn, isNumbersColumn} from '../model/INumberColumn';
import {CANVAS_HEIGHT} from '../styles';
import {ANumbersCellRenderer} from './ANumbersCellRenderer';
import {toHeatMapColor} from './BrightnessCellRenderer';
import IRenderContext, {ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingValue} from './missing';
import {attr, forEachChild, noop, wideEnough} from './utils';

/** @internal */
export default class HeatmapCellRenderer extends ANumbersCellRenderer implements ICellRendererFactory {
  readonly title = 'Heatmap';

  canRender(col: Column) {
    return isNumbersColumn(col) && Boolean(col.dataLength);
  }

  protected createContext(col: INumbersColumn, context: IRenderContext, imposer?: IImposer) {
    const cellDimension = context.colWidth(col) / col.dataLength!;
    const labels = col.labels;
    let templateRows = '';
    for (let i = 0; i < col.dataLength!; ++i) {
      templateRows += `<div style="background-color: white" title=""></div>`;
    }
    return {
      templateRow: templateRows,
      update: (row: HTMLElement, data: number[], item: IDataRow) => {
        forEachChild(row, (d, i) => {
          const v = data[i];
          attr(<HTMLDivElement>d, {
            title: `${labels[i]}: ${DEFAULT_FORMATTER(v)}`,
            'class': isMissingValue(v) ? 'lu-missing' : ''
          }, {
            'background-color': isMissingValue(v) ? null : toHeatMapColor(v, item, col, imposer)
          });
        });
      },
      render: (ctx: CanvasRenderingContext2D, data: number[], item: IDataRow) => {
        data.forEach((d: number, j: number) => {
          const x = j * cellDimension;
          if (isMissingValue(d)) {
            renderMissingValue(ctx, cellDimension, CANVAS_HEIGHT, x, 0);
            return;
          }
          ctx.beginPath();
          ctx.fillStyle = toHeatMapColor(d, item, col, imposer);
          ctx.fillRect(x, 0, cellDimension, CANVAS_HEIGHT);
        });
      }
    };
  }

  createSummary(col: INumbersColumn) {
    let labels = col.labels.slice();
    while (labels.length > 0 && !wideEnough(col, labels.length)) {
      labels = labels.filter((_, i) => i % 2 === 0); // even
    }
    let templateRows = '<div>';
    for (const label of labels) {
      templateRows += `<div title="${label}" data-title="${label}"></div>`;
    }
    templateRows += '</div>';
    return {
      template: templateRows,
      update: noop
    };
  }
}
