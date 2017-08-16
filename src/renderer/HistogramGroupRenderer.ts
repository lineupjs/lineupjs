import ICellRendererFactory from './ICellRendererFactory';
import Column, {IStatistics} from '../model/Column';
import {INumberColumn} from '../model/NumberColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IGroup} from '../model/Group';
import * as d3 from 'd3';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class HistogramGroupRenderer implements ICellRendererFactory {
  private static createHistogram(col: INumberColumn & Column, totalNumberOfRows: number) {
    // as by default used in d3 the Sturges' formula
    const bins = Math.ceil(Math.log(totalNumberOfRows) / Math.LN2) + 1;
    const gen = d3.layout.histogram().range([0,1]).bins(bins);
    const scale = d3.scale.linear().domain([0, 1]).range([0, col.getWidth()]);
    return (rows: IDataRow[], height: number, hist?: IStatistics) => {
      const values = rows.map((d) => col.getValue(d.v, d.dataIndex));
      if (hist) {
        gen.bins(hist.hist.length); //use shared one
      }
      const bins = gen(values);
      const actMaxBin = hist === undefined ? d3.max(bins, (d) => d.y) : hist.maxBin;
      const yscale = d3.scale.linear().domain([0, actMaxBin]).range([height, 0]);
      return {bins, scale, yscale};
    };
  }

  createGroupSVG(col: INumberColumn & Column, context: IDOMRenderContext): ISVGGroupRenderer {
    const factory = HistogramGroupRenderer.createHistogram(col, context.totalNumberOfRows);
    const padding = context.option('rowBarPadding', 1);
    return {
      template: `<g class='histogram'></g>`,
      update: (n: SVGGElement, group: IGroup, rows: IDataRow[], hist?: IStatistics) => {
        const height = context.groupHeight(group) - padding;
        const {bins, scale, yscale} = factory(rows, height, hist);
        const bars = d3.select(n).selectAll('rect').data(bins);
        bars.enter().append('rect');
        bars.attr({
          x: (d) => scale(d.x) + padding,
          y: (d) => yscale(d.y) + padding,
          width: (d) => scale(d.dx) - 2*padding,
          height: (d) => height - yscale(d.y),
          title: (d) => `${d.x} - ${d.x + d.dx} (${d.y})`
        });
      }
    };
  }

  createGroupCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const factory = HistogramGroupRenderer.createHistogram(col, context.totalNumberOfRows);
    const padding = context.option('rowBarPadding', 1);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[], dx: number, dy: number, hist?: IStatistics) => {
      const height = context.groupHeight(group) - padding;
      const {bins, scale, yscale} = factory(rows, height, hist);
      ctx.fillStyle = context.option('style.histogram', 'lightgray');
      bins.forEach((d) => {
        ctx.fillRect(scale(d.x) + padding, yscale(d.y) + padding, scale(d.dx) - 2*padding, height - yscale(d.y));
      });
    };
  }
}
