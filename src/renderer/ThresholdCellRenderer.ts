import NumbersColumn, {INumbersColumn} from '../model/NumbersColumn';
import {ICanvasRenderContext} from './RendererContexts';
import {forEachChild} from '../utils';
import Column from '../model/Column';
import {ANumbersCellRenderer} from './ANumbersCellRenderer';


export default class ThresholdCellRenderer extends ANumbersCellRenderer {

  protected createDOMContext(col: INumbersColumn & Column) {
    const threshold = col.getThreshold();
    const colorValues = col.getColorRange();
    let templateRows = '';
    for (let i = 0; i < col.getDataLength(); ++i) {
      templateRows += `<div style="background-color: white" title=""></div>`;
    }
    return {
      templateRow: templateRows,
      render: (row: HTMLElement, data: number[]) => {
        forEachChild(row, (d: HTMLDivElement, i) => {
          const v = data[i];
          d.className = (v < threshold) ? 'down' : '';
          d.title = NumbersColumn.DEFAULT_FORMATTER(v);
          d.style.backgroundColor = (v < threshold) ? colorValues[0] : colorValues[colorValues.length - 1];
        });
      }
    };
  }

  protected createCanvasContext(col: INumbersColumn & Column, context: ICanvasRenderContext) {
    const cellDimension = context.colWidth(col) / col.getDataLength();
    const threshold = col.getThreshold();
    const colorValues = col.getColorRange();
    return (ctx: CanvasRenderingContext2D, data: number[], offset: number, rowHeight: number) => {
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
