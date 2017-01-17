import ICellRendererFactory from './ICellRendererFactory';
import MultiValueColumn from '../model/MultiValueColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {svg as d3svg} from 'd3';

export default class SparklineCellRenderer implements ICellRendererFactory {

  createSVG(col: MultiValueColumn, context: IDOMRenderContext): ISVGCellRenderer {
    const scales = col.getSparklineScale();
    const xScale = scales.xScale.range([0, col.getWidth()]);
    const yScale = scales.yScale;
    const line = d3svg.line<number>()
      .x((d, j) => xScale(j))
      .y(yScale)
      .interpolate('linear');
    return {
      template: `<path class='sparklinecell'></path>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        yScale.range([context.rowHeight(i), 0]);
        attr(n, {
          d: line(col.getValue(d.v, d.dataIndex))
        });
      }
    };
  }

  createCanvas(col: MultiValueColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    const scales = col.getSparklineScale();
    const xScale = scales.xScale.range([0, col.getWidth()]);
    const yScale = scales.yScale;

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const data = col.getValue(d.v, d.dataIndex);
      let xpos: number, ypos: number;
      yScale.range([context.rowHeight(i), 0]);

      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'black';
      data.forEach((d, i) => {
        ctx.beginPath();
        ctx.moveTo(xpos, ypos);
        xpos = xScale(i);
        ypos = yScale(d);
        ctx.lineTo(xpos, ypos);
        ctx.stroke();
        ctx.fill();
      });
    };
  }
}
