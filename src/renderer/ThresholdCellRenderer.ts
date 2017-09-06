import NumbersColumn, {INumbersColumn} from '../model/NumbersColumn';
import {ICanvasRenderContext} from './RendererContexts';
import {IDataRow} from '../provider/ADataProvider';
import {attr, forEachChild} from '../utils';
import Column from '../model/Column';
import {ANumbersCellRenderer} from './ANumbersCellRenderer';


export default class ThresholdCellRenderer extends ANumbersCellRenderer {

  protected createDOMContext(col: INumbersColumn & Column) {
    const threshold = col.getThreshold();
    const colorValues = col.getRawColorScale().range();
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
          attr(<HTMLDivElement>d, {}, {
            'background-color': (v < threshold) ? colorValues[0] : colorValues[colorValues.length - 1],
            class: (v < threshold) ? 'down' : '',
            title: NumbersColumn.DEFAULT_FORMATTER(v)
          });
        });
      }
    };
  }

  protected createCanvasContext(col: INumbersColumn & Column, context: ICanvasRenderContext) {
    const cellDimension = context.colWidth(col) / col.getDataLength();
    const threshold = col.getThreshold();
    const colorValues = col.getRawColorScale().range();
    return (ctx: CanvasRenderingContext2D, d: IDataRow, offset: number, rowHeight: number) => {
      const data = col.getRawNumbers(d.v, d.dataIndex);
      data.forEach((d, j) => {
        ctx.beginPath();
        const xpos = j * cellDimension;
        const ypos = (d < threshold) ? (rowHeight / 2) : 0;
        ctx.fillStyle = (d < threshold) ? colorValues[0] : colorValues[colorValues.length - 1];
        ctx.fillRect(xpos, ypos + offset, cellDimension, rowHeight / 2);
      });
    };
  }
}
