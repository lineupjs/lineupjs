import ICellRendererFactory from './ICellRendererFactory';
import {default as BoxPlotColumn, IBoxPlotColumn, IBoxPlotData} from '../model/BoxPlotColumn';
import Column from '../model/Column';
import {IDOMRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr, setText} from '../utils';
import {ICanvasRenderContext} from './RendererContexts';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {scale as d3scale} from 'd3';


function computeLabel(v: IBoxPlotData) {
  if (v === null) {
    return '';
  }
  const f = BoxPlotColumn.DEFAULT_FORMATTER;
  return `min = ${f(v.min)}\nq1 = ${f(v.q1)}\nmedian = ${f(v.median)}\nq3 = ${f(v.q3)}\nmax = ${f(v.max)}`;
}

export default class BoxplotCellRenderer implements ICellRendererFactory {

  createDOM(col: IBoxPlotColumn & Column, context: IDOMRenderContext): IDOMCellRenderer {
    const sortMethod = <keyof IBoxPlotData>col.getSortMethod();
    const topPadding = 2.5 * (context.option('rowBarPadding', 1));
    const scale = d3scale.linear().domain([0, 1]).range([0, col.getActualWidth()]);
    const sortedByMe = col.findMyRanker().getSortCriteria().col === col;
    return {
      template: `<svg class='boxplotcell'>
            <title> </title>
            <rect class='boxplotrect' y='${topPadding}'></rect>
            <path class='boxplotallpath'></path>
            <path class='boxplotsortpath' style='display: none'></path>
        </svg>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        const data = col.getBoxPlotData(d.v, d.dataIndex);
        const rowHeight = context.rowHeight(i);
        const scaled = {
          min: scale(data.min),
          median: scale(data.median),
          q1: scale(data.q1),
          q3: scale(data.q3),
          max: scale(data.max)
        };
        attr(n, {
          height: rowHeight
        });
        setText(n.firstElementChild, computeLabel(col.getRawBoxPlotData(d.v, d.dataIndex)));
        attr(<SVGElement>n.children[1], {
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

        attr(<SVGPathElement>n.children[2], {
          d: path
        });
        attr(<SVGPathElement>n.children[3], {
          d: `M${scaled[sortMethod]},${topPadding}L${scaled[sortMethod]},${bottomPos}`
        }, {
          display: sortedByMe ? null : 'none'
        });
      }
    };
  }

  createCanvas(col: IBoxPlotColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const sortMethod = <keyof IBoxPlotData>col.getSortMethod();
    const topPadding = 2.5 * (context.option('rowBarPadding', 1));
    const scale = d3scale.linear().domain([0, 1]).range([0, col.getWidth()]);
    const sortedByMe = col.findMyRanker().getSortCriteria().col === col;

    const boxColor = context.option('style.boxplot.box', '#e0e0e0');
    const boxStroke = context.option('style.boxplot.stroke', 'black');
    const boxSortIndicator = context.option('style.boxplot.sortIndicator', '#ff0700');

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const rowHeight = context.rowHeight(i);

      // Rectangle
      const data = col.getBoxPlotData(d.v, d.dataIndex);
      const scaled = {
        min: scale(data.min),
        median: scale(data.median),
        q1: scale(data.q1),
        q3: scale(data.q3),
        max: scale(data.max)
      };
      const minPos = scaled.min, maxPos = scaled.max, medianPos = scaled.median, q3Pos = scaled.q3, q1Pos = scaled.q1;
      ctx.fillStyle = boxColor;
      ctx.strokeStyle = boxStroke;
      ctx.beginPath();
      ctx.rect((q1Pos), topPadding, ((q3Pos) - (q1Pos)), (rowHeight - (topPadding * 2)));
      ctx.fill();
      ctx.stroke();

      //Line
      const bottomPos = (rowHeight - topPadding);
      const middlePos = (rowHeight - topPadding) / 2;

      ctx.strokeStyle = boxStroke;
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


      if (sortedByMe) {
        ctx.strokeStyle = boxSortIndicator;
        ctx.beginPath();
        ctx.moveTo(scaled[sortMethod], topPadding);
        ctx.lineTo(scaled[sortMethod], bottomPos);
        ctx.stroke();
      }

    };
  }
}
