import ICellRendererFactory from './ICellRendererFactory';
import NumbersColumn, {INumbersColumn} from '../model/NumbersColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {attr, forEach} from '../utils';
import Column from '../model/Column';


export default class ThresholdCellRenderer implements ICellRendererFactory {

  createSVG(col: INumbersColumn & Column, context: IDOMRenderContext): ISVGCellRenderer {
    const cellDimension = col.getWidth() / col.getDataLength();
    const threshold = col.getThreshold();
    const colorValues = col.getRawColorScale().range();
    let templateRows = '';
    for (let i = 0; i < col.getDataLength(); ++i) {
      templateRows += `<rect width="${cellDimension}" height="1" x="${i * cellDimension}" y="0" fill="white"><title></title></rect>`;
    }
    return {
      template: `<g class='thresholdcell'>${templateRows}</g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const rowHeight = context.rowHeight(i);
        const data = col.getRawNumbers(d.v, d.dataIndex);
        forEach(n, 'rect', (d, i) => {
          const v = data[i];
          attr(<SVGRectElement>d, {
            fill: (v < threshold) ? colorValues[0] : colorValues[colorValues.length-1],
            height: (rowHeight / 2),
            y: (v < threshold) ? (rowHeight / 2) : 0
          });
          d.querySelector('title').textContent = NumbersColumn.DEFAULT_FORMATTER(v);
        });
      }
    };
  }

  createCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const cellDimension = col.getWidth() / col.getDataLength();
    const threshold = col.getThreshold();
    const colorValues = col.getRawColorScale().range();

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const data = col.getRawNumbers(d.v, d.dataIndex);
      const rowHeight = context.rowHeight(i);
      data.forEach((d, j) => {
        ctx.beginPath();
        const xpos = j * cellDimension;
        const ypos = (d < threshold) ? (rowHeight / 2) : 0;
        ctx.fillStyle = (d < threshold) ? colorValues[0] : colorValues[colorValues.length-1];
        ctx.fillRect(xpos, ypos, cellDimension, rowHeight / 2);
      });
    };
  }

}
