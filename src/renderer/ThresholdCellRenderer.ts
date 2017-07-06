import ICellRendererFactory from './ICellRendererFactory';
import NumbersColumn, {INumbersColumn} from '../model/NumbersColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {attr, forEach, setText} from '../utils';
import Column from '../model/Column';


export default class ThresholdCellRenderer implements ICellRendererFactory {

  createDOM(col: INumbersColumn & Column, context: IDOMRenderContext): IDOMCellRenderer {
    const threshold = col.getThreshold();
    const colorValues = col.getRawColorScale().range();
    let templateRows = '';
    for (let i = 0; i < col.getDataLength(); ++i) {
      templateRows += `<div style="background-color: white" title=""></div>`;
    }
    return {
      template: `<div class="thresholdcell">${templateRows}</div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        const rowHeight = context.rowHeight(i);
        attr(n, {}, {
          height: rowHeight + 'px'
        });
        const data = col.getRawNumbers(d.v, d.dataIndex);
        forEach(n, 'div', (d, i) => {
          const v = data[i];
          attr(<SVGRectElement>d, {}, {
            'background-color': (v < threshold) ? colorValues[0] : colorValues[colorValues.length-1],
            class: (v < threshold) ? 'down': '',
            title: NumbersColumn.DEFAULT_FORMATTER(v)
          });
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
