import ICellRendererFactory from './ICellRendererFactory';
import MultiValueColumn from '../model/MultiValueColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {select as d3select} from 'd3';


export default class VerticalBarCellRenderer implements ICellRendererFactory {
  private static verticalBarScale(domain: number[], threshold: number, scale: d3.scale.Linear<number,number>, rowHeight: number) {
    return (domain[0] < threshold) ? (scale.range([0, rowHeight / 2])) : scale.range([0, rowHeight]);
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

  createSVG(col: MultiValueColumn, context: IDOMRenderContext): ISVGCellRenderer {
    const colorScale = col.getColorScale();
    const cellDimension = col.calculateCellDimension(col.getWidth());
    const defaultScale = col.getVerticalBarScale();
    const threshold = col.getThreshold();
    const domain = col.getDomain();

    return {
      template: `<g class='verticalbarcell'></g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const rowHeight = context.rowHeight(i);
        const scale = VerticalBarCellRenderer.verticalBarScale(domain, threshold, defaultScale, rowHeight);
        const rect = d3select(n).selectAll('rect').data(col.getValue(d.v, d.dataIndex));
        rect.enter().append('rect').attr('width', cellDimension);
        rect.attr({
          y: (d) => VerticalBarCellRenderer.verticalBarYpos(domain, threshold, d, scale, rowHeight),
          x: (d, j) => (j * cellDimension),
          height: (d: number) => VerticalBarCellRenderer.verticalBarHeight(domain, threshold, d, scale, rowHeight),
          fill: colorScale
        });
        rect.exit().remove();
      }
    };
  }

  createCanvas(col: MultiValueColumn, context: ICanvasRenderContext): ICanvasCellRenderer {

    const colorScale = col.getColorScale();
    const cellDimension = col.calculateCellDimension(col.getWidth());
    const defaultScale = col.getVerticalBarScale();
    const threshold = col.getThreshold();
    const domain = col.getDomain();

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const data = col.getValue(d.v, d.dataIndex);
      const rowHeight = context.rowHeight(i);
      const scale = VerticalBarCellRenderer.verticalBarScale(domain, threshold, defaultScale, rowHeight);

      data.forEach((d, j) => {
        const xpos = (j * cellDimension);
        const ypos = VerticalBarCellRenderer.verticalBarYpos(domain, threshold, d, scale, rowHeight);
        ctx.fillStyle = String(colorScale(d));
        ctx.fillRect(xpos, ypos, cellDimension, VerticalBarCellRenderer.verticalBarHeight(domain, threshold, d, scale, rowHeight));
      });
    };
  }

}
