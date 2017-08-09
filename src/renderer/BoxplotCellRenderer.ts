import ICellRendererFactory from './ICellRendererFactory';
import {default as BoxPlotColumn, IBoxPlotColumn, IBoxPlotData} from '../model/BoxPlotColumn';
import Column from '../model/Column';
import {IDOMRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {isSortedByMe} from '../utils';
import {ICanvasRenderContext} from './RendererContexts';
import ICanvasCellRenderer from './ICanvasCellRenderer';

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
    const sortedByMe = isSortedByMe(col);
    return {
      template: `<div title="">
                    <div><div></div><div></div></div>
                 </div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        const data = col.getBoxPlotData(d.v, d.dataIndex);
        n.style.display = data ? null : 'none';
        if (!data) {
          return;
        }
        n.title = computeLabel(col.getRawBoxPlotData(d.v, d.dataIndex)!);


        const wiskers = <HTMLElement>n.firstElementChild;
        const box = <HTMLElement>wiskers.firstElementChild;
        const median = <HTMLElement>wiskers.lastElementChild;

        wiskers.dataset.sort = sortedByMe ? sortMethod: '';
        wiskers.style.left = `${Math.round(data.min * 100)}%`;
        const range = data.max - data.min;
        wiskers.style.width = `${Math.round(range * 100)}%`;

        //relative within the wiskers
        box.style.left = `${Math.round((data.q1 - data.min)/range * 100)}%`;
        box.style.width = `${Math.round((data.q3 - data.q1)/range * 100)}%`;

        //relative within the wiskers
        median.style.left = `${Math.round((data.median - data.min)/range * 100)}%`;
      }
    };
  }

  createCanvas(col: IBoxPlotColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const sortMethod = <keyof IBoxPlotData>col.getSortMethod();
    const topPadding = 2.5 * (context.option('rowBarPadding', 1));
    const sortedByMe = isSortedByMe(col);
    const width = col.getActualWidth();
    const boxColor = context.option('style.boxplot.box', '#e0e0e0');
    const boxStroke = context.option('style.boxplot.stroke', 'black');
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


      if (!sortedByMe) {
        return;
      }
      ctx.strokeStyle = boxSortIndicator;
      ctx.beginPath();
      ctx.moveTo(scaled[sortMethod], topPadding);
      ctx.lineTo(scaled[sortMethod], bottomPos);
      ctx.stroke();
    };
  }
}
