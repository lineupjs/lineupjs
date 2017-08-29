import ICellRendererFactory from './ICellRendererFactory';
import {default as BoxPlotColumn, IBoxPlotColumn, IBoxPlotData} from '../model/BoxPlotColumn';
import Column from '../model/Column';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {ICanvasRenderContext} from './RendererContexts';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {INumberColumn} from '../model/NumberColumn';
import {IGroup} from '../model/Group';
import {LazyBoxPlotData} from '../model/NumbersColumn';

export function computeLabel(v: IBoxPlotData) {
  if (v === null) {
    return '';
  }
  const f = BoxPlotColumn.DEFAULT_FORMATTER;
  return `min = ${f(v.min)}\nq1 = ${f(v.q1)}\nmedian = ${f(v.median)}\nq3 = ${f(v.q3)}\nmax = ${f(v.max)}`;
}

export default class BoxplotCellRenderer implements ICellRendererFactory {

  createDOM(col: IBoxPlotColumn & Column): IDOMCellRenderer {
    const sortMethod = <keyof IBoxPlotData>col.getSortMethod();
    const sortedByMe = col.isSortedByMe().asc !== undefined;
    return {
      template: `<div title="">
                    <div><div></div><div></div></div>
                 </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const data = col.getBoxPlotData(d.v, d.dataIndex);
        n.style.display = data ? null : 'none';
        if (!data) {
          return;
        }
        const label = col.getRawBoxPlotData(d.v, d.dataIndex)!;
        renderDOMBoxPlot(n, data, label);
        const wiskers = <HTMLElement>n.firstElementChild;
        wiskers.dataset.sort = sortedByMe ? sortMethod : '';
      }
    };
  }

  createCanvas(col: IBoxPlotColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const sortMethod = <keyof IBoxPlotData>col.getSortMethod();
    const topPadding = context.option('rowBarPadding', 1);
    const sortedByMe = col.isSortedByMe().asc !== undefined;
    const width = context.colWidth(col);
    const boxSortIndicator = context.option('style.boxplot.sortIndicator', '#ff0700');

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const rowHeight = context.rowHeight(i);

      // Rectangle
      const data = col.getBoxPlotData(d.v, d.dataIndex);
      if (!data) {
        return;
      }
      const scaled = {
        min: data.min * width,
        median: data.median * width,
        q1: data.q1 * width,
        q3: data.q3 * width,
        max: data.max * width
      };
      renderBoxPlot(ctx, scaled, rowHeight, topPadding, context);

      if (!sortedByMe) {
        return;
      }
      ctx.strokeStyle = boxSortIndicator;
      ctx.beginPath();
      ctx.moveTo(scaled[sortMethod], topPadding);
      ctx.lineTo(scaled[sortMethod], rowHeight - topPadding);
      ctx.stroke();
      ctx.fill();
    };
  }


  createGroupDOM(col: INumberColumn & Column): IDOMGroupRenderer {
    return {
      template: `<div title="">
                    <div><div></div><div></div></div>
                 </div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const box = new LazyBoxPlotData(rows.map((row) => col.getValue(row.v, row.dataIndex)));
        renderDOMBoxPlot(n, box, box);
      }
    };
  }

  createGroupCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const topPadding = context.option('rowBarGroupPadding', 1);
    const width = context.colWidth(col);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      const height = context.groupHeight(group);
      const data = new LazyBoxPlotData(rows.map((row) => col.getValue(row.v, row.dataIndex)));

      const scaled = {
        min: data.min * width,
        median: data.median * width,
        q1: data.q1 * width,
        q3: data.q3 * width,
        max: data.max * width
      };
      renderBoxPlot(ctx, scaled, height, topPadding, context);
    };
  }
}

function renderDOMBoxPlot(n: HTMLElement, data: IBoxPlotData, label: IBoxPlotData) {
  n.title = computeLabel(label);

  const wiskers = <HTMLElement>n.firstElementChild;
  const box = <HTMLElement>wiskers.firstElementChild;
  const median = <HTMLElement>wiskers.lastElementChild;

  wiskers.style.left = `${Math.round(data.min * 100)}%`;
  const range = data.max - data.min;
  wiskers.style.width = `${Math.round(range * 100)}%`;

  //relative within the wiskers
  box.style.left = `${Math.round((data.q1 - data.min) / range * 100)}%`;
  box.style.width = `${Math.round((data.q3 - data.q1) / range * 100)}%`;

  //relative within the wiskers
  median.style.left = `${Math.round((data.median - data.min) / range * 100)}%`;
}

function renderBoxPlot(ctx: CanvasRenderingContext2D, box: IBoxPlotData, height: number, topPadding: number, context: ICanvasRenderContext) {
  const boxColor = context.option('style.boxplot.box', '#e0e0e0');
  const boxStroke = context.option('style.boxplot.stroke', 'black');

  const boxTopPadding = topPadding + ((height - topPadding * 2) * 0.1);
  const minPos = box.min, maxPos = box.max, medianPos = box.median, q3Pos = box.q3, q1Pos = box.q1;

  ctx.fillStyle = boxColor;
  ctx.strokeStyle = boxStroke;
  ctx.beginPath();
  ctx.rect(q1Pos, boxTopPadding, q3Pos - q1Pos, height - (boxTopPadding * 2));
  ctx.fill();
  ctx.stroke();

  //Line
  const bottomPos = height - topPadding;
  const middlePos = height / 2;

  ctx.beginPath();
  ctx.moveTo(minPos, middlePos);
  ctx.lineTo(q1Pos, middlePos);
  ctx.moveTo(minPos, topPadding);
  ctx.lineTo(minPos, bottomPos);
  ctx.moveTo(medianPos, boxTopPadding);
  ctx.lineTo(medianPos, height - boxTopPadding);
  ctx.moveTo(q3Pos, middlePos);
  ctx.lineTo(maxPos, middlePos);
  ctx.moveTo(maxPos, topPadding);
  ctx.lineTo(maxPos, bottomPos);
  ctx.stroke();
  ctx.fill();
}
