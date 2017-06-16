import ICellRendererFactory from './ICellRendererFactory';
import NumbersColumn, {INumbersColumn} from '../model/NumbersColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer, IHTMLCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {attr, forEach} from '../utils';
import Column from '../model/Column';


export default class NumbersCellRenderer implements ICellRendererFactory {

  createSVG(col: INumbersColumn & Column, context: IDOMRenderContext): ISVGCellRenderer {
    const cellDimension = col.getWidth() / col.getDataLength();
    const colorScale = col.getRawColorScale();
    const padding = context.option('rowBarPadding', 1);
    let templateRows = '';
    for (let i = 0; i < col.getDataLength(); ++i) {
      templateRows += `<rect y="${padding}" width="${cellDimension}" height="1" x="${i * cellDimension}" fill="white"><title></title></rect>`;
    }
    return {
      template: `<g class="heatmapcell">${templateRows}</g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const rowHeight = context.rowHeight(i);
        const data = col.getRawNumbers(d.v, d.dataIndex);
        forEach(n, 'rect', (d, i) => {
          const v = data[i];
          attr(<SVGRectElement>d, {
            fill: colorScale(v),
            height: rowHeight
          });
          d.querySelector('title').textContent = NumbersColumn.DEFAULT_FORMATTER(v);
        });
      }
    };
  }

  createHTML(col: INumbersColumn & Column, context: IDOMRenderContext): IHTMLCellRenderer {
    const cellDimension = col.getWidth() / col.getDataLength();
    const padding = context.option('rowBarPadding', 1);
    const colorScale = col.getRawColorScale();
    let templateRows = '';
    for (let i = 0; i < col.getDataLength(); ++i) {
      templateRows += `<div style="left: ${i* cellDimension}px; width: ${cellDimension}px; background-color: white" title=""></div>`;
    }
    return {
      template: `<div class="heatmapcell" style="top:${padding}px;"></div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        const rowHeight = context.rowHeight(i);
        const data = col.getRawNumbers(d.v, d.dataIndex);
        forEach(n, 'div', (d, i) => {
          const v = data[i];
          (<HTMLDivElement>d).style.backgroundColor = colorScale(v);
          (<HTMLDivElement>d).style.height = rowHeight + 'px';
          (<HTMLDivElement>d).title = NumbersColumn.DEFAULT_FORMATTER(v);
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
