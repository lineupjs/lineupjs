import ICellRendererFactory from './ICellRendererFactory';
import {default as BoxPlotColumn, IBoxPlotColumn, IBoxPlotData} from '../model/BoxPlotColumn';
import Column from '../model/Column';
import {IDOMRenderContext} from './RendererContexts';
import {ISVGCellRenderer, ISVGGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr} from '../utils';
import {ICanvasRenderContext} from './RendererContexts';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {scale as d3scale, min as d3min, max as d3max} from 'd3';
import {INumberColumn} from '../model/NumberColumn';
import {IGroup} from '../model/Group';
import {createLazyBoxPlotData} from '../model/MultiValueColumn';


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
        attr(<SVGPathElement>n.querySelector('path.boxplotallpath'), {
          d: boxPlotPath(scaled, rowHeight, topPadding)
        });
        attr(<SVGPathElement>n.querySelector('path.boxplotsortpath'), {
          d: `M${scaled[sortMethod]},${topPadding}L${scaled[sortMethod]},${rowHeight - topPadding}`
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
      renderBoxPlot(ctx, scaled, rowHeight, topPadding);

      if (sortedByMe) {
        ctx.strokeStyle = 'red';
        ctx.fillStyle = '#ff0700';
        ctx.beginPath();
        ctx.moveTo(scaled[sortMethod], topPadding);
        ctx.lineTo(scaled[sortMethod], rowHeight - topPadding);
        ctx.stroke();
        ctx.fill();
      }

    };
  }


  createGroupSVG(col: INumberColumn & Column, context: IDOMRenderContext): ISVGGroupRenderer {
    const topPadding = 2.5 * (context.option('rowBarPadding', 1));
    return {
      template: `<g class='boxplotcell'>
            <title></title>
            <rect class='cellbg'></rect>
            <rect class='boxplotrect' y='${topPadding}'></rect>
            <path class='boxplotallpath'></path>
        </g>`,
      update: (n: SVGGElement, group: IGroup, rows: IDataRow[]) => {
        const height = context.groupHeight(group);
        const box = createLazyBoxPlotData(rows.map((row) => col.getValue(row.v, row.dataIndex)));
        attr(<SVGElement>n.querySelector('rect.cellbg'),{
          width: col.getWidth(),
          height
        });
        n.querySelector('title').textContent = computeLabel(box);
        attr(<SVGElement>n.querySelector('rect.boxplotrect'), {
          x: box.q1,
          width: (box.q3 - box.q1),
          height: (height - (topPadding * 2))
        });
        attr(<SVGPathElement>n.querySelector('path.boxplotallpath'), {
          d: boxPlotPath(box, height, topPadding)
        });
      }
    };
  }

  createGroupCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const topPadding = 2.5 * (context.option('rowBarPadding', 1));
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      const height = context.groupHeight(group);
      const box = createLazyBoxPlotData(rows.map((row) => col.getValue(row.v, row.dataIndex)));
      renderBoxPlot(ctx, box, height, topPadding);
    };
  }
}

function boxPlotPath(box: IBoxPlotData, height: number, topPadding: number) {
  const bottomPos = height - topPadding;
  const middlePos = (height - topPadding) / 2;
  return `M${box.min},${middlePos}L${box.q1},${middlePos}M${box.min},${topPadding}L${box.min},${bottomPos}` +   //minimum line
    `M${box.median},${topPadding}L${box.median},${bottomPos}` +   //median line
    `M${box.q3},${middlePos}L${box.max},${middlePos}` +
    `M${box.max},${topPadding}L${box.max},${bottomPos}`;  // maximum line
}

function renderBoxPlot(ctx: CanvasRenderingContext2D, box: IBoxPlotData, height: number, topPadding: number) {
  const minPos = box.min, maxPos = box.max, medianPos = box.median, q3Pos = box.q3, q1Pos = box.q1;
  ctx.fillStyle = '#e0e0e0';
  ctx.strokeStyle = 'black';
  ctx.beginPath();
  ctx.rect((q1Pos), topPadding, ((q3Pos) - (q1Pos)), (height - (topPadding * 2)));
  ctx.fill();
  ctx.stroke();

  //Line
  const bottomPos = height - topPadding;
  const middlePos = (height - topPadding) / 2;

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
}
