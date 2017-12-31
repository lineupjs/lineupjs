import {isMissingValue} from '../model';
import Column from '../model/Column';
import {DEFAULT_FORMATTER, INumbersColumn} from '../model/INumberColumn';
import {CANVAS_HEIGHT} from '../styles';
import {ANumbersCellRenderer} from './ANumbersCellRenderer';
import IRenderContext from './interfaces';
import {renderMissingValue} from './missing';
import {attr, forEachChild} from './utils';

export default class NumbersCellRenderer extends ANumbersCellRenderer {
  readonly title = 'Heatmap';

  protected createContext(col: INumbersColumn & Column, context: IRenderContext) {
    const cellDimension = context.colWidth(col) / col.getDataLength();
    const colorScale = col.getRawColorScale();
    let templateRows = '';
    for (let i = 0; i < col.getDataLength(); ++i) {
      templateRows += `<div style="background-color: white" title=""></div>`;
    }
    return {
      templateRow: templateRows,
      update: (row: HTMLElement, data: number[]) => {
        forEachChild(row, (d, i) => {
          const v = data[i];
          attr(<HTMLDivElement>d, {
            title: DEFAULT_FORMATTER(v),
            'class': isMissingValue(v) ? 'lu-missing' : ''
          }, {
            'background-color': isMissingValue(v) ? null : colorScale(v)
          });
        });
      },
      render: (ctx: CanvasRenderingContext2D, data: number[]) => {
        data.forEach((d: number, j: number) => {
          const x = j * cellDimension;
          if (isMissingValue(d)) {
            renderMissingValue(ctx, cellDimension, CANVAS_HEIGHT, x, 0);
            return;
          }
          ctx.beginPath();
          ctx.fillStyle = colorScale(d);
          ctx.fillRect(x, 0, cellDimension, CANVAS_HEIGHT);
        });
      }
    };
  }
}
