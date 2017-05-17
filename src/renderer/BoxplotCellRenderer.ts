import ICellRendererFactory from './ICellRendererFactory';
import {default as BoxPlotColumn, IBoxPlotColumn, IBoxPlotData} from '../model/BoxPlotColumn';
import Column from '../model/Column';
import {IDOMRenderContext} from './RendererContexts';
import {ISVGCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr} from '../utils';
import {ICanvasRenderContext} from './RendererContexts';
import ICanvasCellRenderer  from './ICanvasCellRenderer';
import {scale as d3scale, min as d3min, max as d3max} from 'd3';


function computeLabel(v: IBoxPlotData) {
  if (v === null) {
    return '';
  }
  const f = BoxPlotColumn.DEFAULT_FORMATTER;
  return `min = ${f(v.min)}\nq1 = ${f(v.q1)}\nmedian = ${f(v.median)}\nq3 = ${f(v.q3)}\nmax = ${f(v.max)}`;
}

export default class BoxplotCellRenderer implements ICellRendererFactory {

  createSVG(col: IBoxPlotColumn & Column, context: IDOMRenderContext): ISVGCellRenderer {
    const sortMethod = col.getSortMethod();
    const topPadding = 2.5 * (context.option('rowBarPadding', 1));
    const domain = col.getDomain();
    const scale = d3scale.linear().domain(domain).range([0, col.getWidth()]);
    const sortedByMe = col.findMyRanker().getSortCriteria().col === col;
    return {

      template: `<g class='boxplotcell'>
            <title></title>
            <rect class='cellbg'></rect>
            <rect class='boxplotrect' y='${topPadding}'></rect>
            <path class='boxplotallpath'></path>
            <path class='boxplotsortpath' style='display: none'></path>
        </g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const rawBoxdata = col.getBoxPlotData(d.v, d.dataIndex);
        const rowHeight = context.rowHeight(i);
        const scaled = {
          min: scale(rawBoxdata.min),
          median: scale(rawBoxdata.median),
          q1: scale(rawBoxdata.q1),
          q3: scale(rawBoxdata.q3),
          max: scale(rawBoxdata.max)
        };
        attr(<SVGElement>n.querySelector('rect.cellbg'),{
          width: col.getWidth(),
          height: rowHeight
        });
        n.querySelector('title').textContent = computeLabel(rawBoxdata);
        attr(<SVGElement>n.querySelector('rect.boxplotrect'), {
          x: scaled.q1,
          width: (scaled.q3 - scaled.q1),
          height: (rowHeight - (topPadding * 2))
        });
        const bottomPos = (rowHeight - topPadding);
        const middlePos = (rowHeight - topPadding) / 2;
        const path = `M${scaled.min},${middlePos}L${scaled.q1},${middlePos}M${scaled.min},${topPadding}L${scaled.min},${bottomPos}` +   //minimum line
          `M${scaled.median},${topPadding}L${scaled.median},${bottomPos}` +   //median line
          `M${scaled.q3},${middlePos}L${scaled.max},${middlePos}` +
          `M${scaled.max},${topPadding}L${scaled.max},${bottomPos}`;   // maximum line

        attr(<SVGPathElement>n.querySelector('path.boxplotallpath'), {
          d: path
        });
        attr(<SVGPathElement>n.querySelector('path.boxplotsortpath'), {
          d: `M${scaled[sortMethod]},${topPadding}L${scaled[sortMethod]},${bottomPos}`
        }, {
          display: sortedByMe ? null : 'none'
        });
      }
    };
  }

  createCanvas(col: IBoxPlotColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const sortMethod = col.getSortMethod();
    const topPadding = 2.5 * (context.option('rowBarPadding', 1));
    const domain = col.getDomain();

    const scale = d3scale.linear().domain([d3min(domain), d3max(domain)]).range([0, col.getWidth()]);
    const sortedByMe = col.findMyRanker().getSortCriteria().col === col;

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const rowHeight = context.rowHeight(i);

      // Rectangle
      const rawBoxdata = col.getBoxPlotData(d.v, d.dataIndex);
      const scaled = {
        min: scale(rawBoxdata.min),
        median: scale(rawBoxdata.median),
        q1: scale(rawBoxdata.q1),
        q3: scale(rawBoxdata.q3),
        max: scale(rawBoxdata.max)
      };
      const minPos = scaled.min, maxPos = scaled.max, medianPos = scaled.median, q3Pos = scaled.q3, q1Pos = scaled.q1;
      ctx.fillStyle = '#e0e0e0';
      ctx.strokeStyle = 'black';
      ctx.beginPath();
      ctx.rect((q1Pos), topPadding, ((q3Pos) - (q1Pos)), (rowHeight - (topPadding * 2)));
      ctx.fill();
      ctx.stroke();

      //Line
      const bottomPos = (rowHeight - topPadding);
      const middlePos = (rowHeight - topPadding) / 2;

      ctx.strokeStyle = 'black';
      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath();
      ctx.moveTo(minPos, middlePos);
      ctx.lineTo((q1Pos), middlePos);
      ctx.moveTo(minPos, topPadding);
      ctx.lineTo(minPos, bottomPos);
      ctx.moveTo(medianPos, topPadding);
      ctx.lineTo(medianPos, bottomPos);
      ctx.moveTo((q3Pos), middlePos);
      ctx.lineTo(maxPos, middlePos);
      ctx.moveTo(maxPos, topPadding);
      ctx.lineTo(maxPos, bottomPos);
      ctx.stroke();
      ctx.fill();


      if (sortedByMe) {
        ctx.strokeStyle = 'red';
        ctx.fillStyle = '#ff0700';
        ctx.beginPath();
        ctx.moveTo(scaled[sortMethod], topPadding);
        ctx.lineTo(scaled[sortMethod], bottomPos);
        ctx.stroke();
        ctx.fill();
      }

    };
  }
}
