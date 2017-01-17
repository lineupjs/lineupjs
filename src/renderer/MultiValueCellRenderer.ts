import ICellRendererFactory from './ICellRendererFactory';
import MultiValueColumn from '../model/MultiValueColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer, IHTMLCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {select as d3select} from 'd3';


export default class MultiValueCellRenderer implements ICellRendererFactory {

  createSVG(col: MultiValueColumn, context: IDOMRenderContext): ISVGCellRenderer {
    const cellDimension = col.calculateCellDimension(col.getWidth());
    const colorScale = col.getColorScale();
    const padding = context.option('rowBarPadding', 1);
    return {

      template: `<g class="heatmapcell"></g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const rect = d3select(n).selectAll('rect').data(col.getValue(d.v, d.dataIndex));
        rect.enter().append('rect').attr({
          y: padding,
          width: cellDimension,
          height: context.rowHeight(i)
        });
        rect.attr({
          x: (d, i) => i * cellDimension,
          fill: colorScale
        });
        rect.exit().remove();
      }
    };
  }

  createHTML(col: MultiValueColumn, context: IDOMRenderContext): IHTMLCellRenderer {
    const cellDimension = col.calculateCellDimension(col.getWidth());
    const padding = context.option('rowBarPadding', 1);
    const colorScale = col.getColorScale();

    return {
      template: `<div class="heatmapcell" style="top:${padding}px;"></div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        const g = d3select(n);
        const div = g.selectAll('div').data(col.getValue(d.v, d.dataIndex));
        div.enter().append('div').style({
          widht: cellDimension + 'px',
          height: context.rowHeight(i) + 'px'
        });
        div.style({
          'background-color': colorScale,
          'left': (d, i) => (i * cellDimension) + 'px'
        });
      }
    };
  }

  createCanvas(col: MultiValueColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    const cellDimension = col.calculateCellDimension(col.getWidth());
    const padding = context.option('rowBarPadding', 1);
    const colorScale = col.getColorScale();

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const data = col.getValue(d.v, d.dataIndex);
      const rowHeight = context.rowHeight(i);
      data.forEach((d: number, j: number) => {
        const x = (j * cellDimension);
        ctx.beginPath();
        ctx.fillStyle = String(colorScale(d));
        ctx.fillRect(x, padding, cellDimension, rowHeight);
      });
    };
  }
}
