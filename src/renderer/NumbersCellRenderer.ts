import {ICanvasRenderContext} from './RendererContexts';
import {attr, forEachChild} from '../utils';
import Column from '../model/Column';
import {ANumbersCellRenderer} from './ANumbersCellRenderer';
import {renderMissingValue} from './missing';
import {isMissingValue} from '../model/missing';
import {DEFAULT_FORMATTER, INumbersColumn} from '../model/INumberColumn';

export default class NumbersCellRenderer extends ANumbersCellRenderer {
  readonly title = 'Heatmap';

  protected createDOMContext(col: INumbersColumn & Column) {
    const colorScale = col.getRawColorScale();
    let templateRows = '';
    for (let i = 0; i < col.getDataLength(); ++i) {
      templateRows += `<div style="background-color: white" title=""></div>`;
    }
    return {
      templateRow: templateRows,
      render: (row: HTMLElement, data: number[]) => {
        forEachChild(row, (d, i) => {
          const v = data[i];
          attr(<HTMLDivElement>d, {
            title: DEFAULT_FORMATTER(v),
            'class': isMissingValue(v) ? 'lu-missing' : ''
          }, {
            'background-color': isMissingValue(v) ? null : colorScale(v)
          });
        });
      }
    };
  }

  protected createCanvasContext(col: INumbersColumn & Column, context: ICanvasRenderContext) {
    const cellDimension = context.colWidth(col) / col.getDataLength();
    const padding = context.option('rowBarPadding', 1);
    const colorScale = col.getRawColorScale();

    return (ctx: CanvasRenderingContext2D, data: number[], offset: number, rowHeight: number) => {
      data.forEach((d: number, j: number) => {
        const x = j * cellDimension;
        if (isMissingValue(d)) {
          renderMissingValue(ctx, cellDimension, rowHeight, x, padding + offset);
          return;
        }
        ctx.beginPath();
        ctx.fillStyle = colorScale(d);
        ctx.fillRect(x, padding + offset, cellDimension, rowHeight);
      });
    };
  }
}
