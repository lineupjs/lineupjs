import NumbersColumn, {INumbersColumn} from '../model/NumbersColumn';
import {ICanvasRenderContext} from './RendererContexts';
import {IDataRow} from '../provider/ADataProvider';
import {attr, forEachChild} from '../utils';
import Column from '../model/Column';
import {ANumbersCellRenderer} from './ANumbersCellRenderer';

export default class NumbersCellRenderer extends ANumbersCellRenderer {

  protected createDOMContext(col: INumbersColumn & Column) {
    const colorScale = col.getRawColorScale();
    let templateRows = '';
    for (let i = 0; i < col.getDataLength(); ++i) {
      templateRows += `<div style="background-color: white" title=""></div>`;
    }
    return {
      templateRow: templateRows,
      render: (row: HTMLElement, d: IDataRow) => {
        const data = col.getRawNumbers(d.v, d.dataIndex);
        forEachChild(row, (d, i) => {
          const v = data[i];
          attr(<HTMLDivElement>d, {
            title: NumbersColumn.DEFAULT_FORMATTER(v)
          }, {
            'background-color': colorScale(v)
          });
        });
      }
    };
  }

  protected createCanvasContext(col: INumbersColumn & Column, context: ICanvasRenderContext) {
    const cellDimension = context.colWidth(col) / col.getDataLength();
    const padding = context.option('rowBarPadding', 1);
    const colorScale = col.getRawColorScale();

    return (ctx: CanvasRenderingContext2D, d: IDataRow, offset: number, rowHeight: number) => {
      const data = col.getRawNumbers(d.v, d.dataIndex);
      data.forEach((d: number, j: number) => {
        const x = j * cellDimension;
        ctx.beginPath();
        ctx.fillStyle = colorScale(d);
        ctx.fillRect(x, padding + offset, cellDimension, rowHeight);
      });
    };
  }
}
