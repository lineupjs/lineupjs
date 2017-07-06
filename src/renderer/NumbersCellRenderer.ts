import ICellRendererFactory from './ICellRendererFactory';
import NumbersColumn, {INumbersColumn} from '../model/NumbersColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {attr, forEach, setText} from '../utils';
import Column from '../model/Column';


export default class NumbersCellRenderer implements ICellRendererFactory {

  createDOM(col: INumbersColumn & Column, context: IDOMRenderContext): IDOMCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    const colorScale = col.getRawColorScale();
    let templateRows = '';
    for (let i = 0; i < col.getDataLength(); ++i) {
      templateRows += `<div style="background-color: white" title=""></div>`;
    }
    return {
      template: `<div class="heatmapcell" style="top:${padding}px; width=${col.getWidth()}px"></div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        attr(n, {}, {
          width: col.getWidth() + 'px',
          height: (context.rowHeight(i) - padding*2) + 'px'
        });
        const data = col.getRawNumbers(d.v, d.dataIndex);
        forEach(n, 'div', (d, i) => {
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

  createCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const cellDimension = col.getWidth() / col.getDataLength();
    const padding = context.option('rowBarPadding', 1);
    const colorScale = col.getRawColorScale();

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const data = col.getRawNumbers(d.v, d.dataIndex);
      const rowHeight = context.rowHeight(i);
      data.forEach((d: number, j: number) => {
        const x = j * cellDimension;
        ctx.beginPath();
        ctx.fillStyle = colorScale(d);
        ctx.fillRect(x, padding, cellDimension, rowHeight);
      });
    };
  }
}
