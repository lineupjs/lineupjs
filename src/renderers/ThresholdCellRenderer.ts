import ICellRendererFactory from './ICellRendererFactory';
import MultiValueColumn from '../model/MultiValueColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {select as d3select} from 'd3';


export default class ThresholdCellRenderer implements ICellRendererFactory {

  createSVG(col: MultiValueColumn, context: IDOMRenderContext): ISVGCellRenderer {
    const cellDimension = col.calculateCellDimension(col.getWidth());
    const threshold = col.getThreshold();
    const colorValues = col.getColorScale().range();

    return {
      template: `<g class='thresholdcell'></g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const rowHeight = context.rowHeight(i);
        const rect = d3select(n).selectAll('rect').data(col.getValue(d.v, d.dataIndex));
        rect.enter().append('rect');
        rect
          .attr({
            y: (d, j) => (d < threshold) ? (rowHeight / 2) : 0,
            x: (d, j) => (j * cellDimension),
            width: cellDimension,
            height: (d, j) => (rowHeight / 2),
            fill: (d) => (d < threshold) ? colorValues[0] : colorValues[2]
          });
        rect.exit().remove();
      }
    };
  }

  createCanvas(col: MultiValueColumn, context: ICanvasRenderContext): ICanvasCellRenderer {

    const cellDimension = col.calculateCellDimension(col.getWidth());
    const threshold = col.getThreshold();
    const colorValues = col.getColorScale().range();

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const data = col.getValue(d.v, d.dataIndex);
      const rowHeight = context.rowHeight(i);
      data.forEach((d, j) => {
        ctx.beginPath();
        const xpos = (j * cellDimension);
        const ypos = (d < threshold) ? (rowHeight / 2) : 0;
        ctx.fillStyle = (d < threshold) ? colorValues[0] : colorValues[2];
        ctx.fillRect(xpos, ypos, cellDimension, rowHeight / 2);
      });
    };
  }

}
