import ICellRendererFactory from './ICellRendererFactory';
import NumbersColumn, {INumbersColumn} from '../model/NumbersColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {scale as d3scale} from 'd3';
import Column from '../model/Column';
import {attr, forEach} from '../utils';

export default class VerticalBarCellRenderer implements ICellRendererFactory {
  private static verticalBarScale(domain: number[], threshold: number, scale: d3.scale.Linear<number,number>, rowHeight: number) {
    return (domain[0] < threshold) ? scale.range([0, rowHeight / 2]) : scale.range([0, rowHeight]);
  }
  private static verticalBarYpos(domain: number[], threshold: number, cellData: number, scale: d3.scale.Linear<number,number>, rowHeight: number) {
    if (domain[0] < threshold) {
      return (cellData < threshold) ? (rowHeight / 2) : rowHeight / 2 - scale(cellData);   // For positive and negative value
    } else {
      return rowHeight - scale(cellData);
    }
  }
  private static verticalBarHeight(domain: number[], threshold: number, cellData: number, scale: d3.scale.Linear<number,number>, rowHeight: number) {
    return (domain[0] < threshold) ? (rowHeight / 2 - scale(cellData)) : scale(cellData);
  }

  createSVG(col: INumbersColumn & Column, context: IDOMRenderContext): ISVGCellRenderer {
    const colorScale = col.getRawColorScale();
    const cellDimension = col.getWidth() / col.getDataLength();
    const domain = col.getMapping().domain;
    const defaultScale = d3scale.linear().domain(domain);
    const threshold = col.getThreshold();
    let templateRows = '';
    for (let i = 0; i < col.getDataLength(); ++i) {
      templateRows += `<rect width="${cellDimension}" height="1" x="${i * cellDimension}" y="0" fill="white"><title></title></rect>`;
    }
    return {
      template: `<g class='verticalbarcell'>${templateRows}</g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const rowHeight = context.rowHeight(i);
        const scale = VerticalBarCellRenderer.verticalBarScale(domain, threshold, defaultScale, rowHeight);
        const data = col.getRawNumbers(d.v, d.dataIndex);
        forEach(n, 'rect', (d, i) => {
          const v = data[i];
          attr(<SVGRectElement>d, {
            fill: colorScale(v),
            height: VerticalBarCellRenderer.verticalBarHeight(domain, threshold, v, scale, rowHeight),
            y: VerticalBarCellRenderer.verticalBarYpos(domain, threshold, v, scale, rowHeight),
          });
          d.querySelector('title').textContent = NumbersColumn.DEFAULT_FORMATTER(v);
        });
      }
    };
  }

  createCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const colorScale = col.getRawColorScale();
    const cellDimension = col.getWidth() / col.getDataLength();
    const domain = col.getMapping().domain;
    const defaultScale = d3scale.linear().domain(domain);
    const threshold = col.getThreshold();

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const data = col.getRawNumbers(d.v, d.dataIndex);
      const rowHeight = context.rowHeight(i);
      const scale = VerticalBarCellRenderer.verticalBarScale(domain, threshold, defaultScale, rowHeight);

      data.forEach((d, j) => {
        const xpos = (j * cellDimension);
        const ypos = VerticalBarCellRenderer.verticalBarYpos(domain, threshold, d, scale, rowHeight);
        ctx.fillStyle = colorScale(d);
        ctx.fillRect(xpos, ypos, cellDimension, VerticalBarCellRenderer.verticalBarHeight(domain, threshold, d, scale, rowHeight));
      });
    };
  }

}
