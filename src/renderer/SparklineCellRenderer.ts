import ICellRendererFactory from './ICellRendererFactory';
import {INumbersColumn} from '../model/NumbersColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {svg as d3svg, scale as d3scale} from 'd3';
import Column from '../model/Column';
import {attr} from '../utils';

function createScales(col: INumbersColumn & Column) {
  const xScale = d3scale.linear().domain([0, col.getDataLength() - 1]).range([0, col.getActualWidth()]);
  const yScale = d3scale.linear().domain([0, 1]);
  return {xScale, yScale};
}

export default class SparklineCellRenderer implements ICellRendererFactory {

  createDOM(col: INumbersColumn & Column, context: IDOMRenderContext): IDOMCellRenderer {
    const {xScale, yScale} = createScales(col);
    const line = d3svg.line<number>()
      .x((d, j) => xScale(j))
      .y(yScale)
      .interpolate('linear');

    return {
      template: `<svg height="20"><path></path></svg>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        const height = context.rowHeight(i);
        yScale.range([height, 0]);
        attr(n, {
          height
        });
        n.firstElementChild!.setAttribute('d', line(col.getNumbers(d.v, d.dataIndex)));
      }
    };
  }

  createCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const {xScale, yScale} = createScales(col);

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const data = col.getNumbers(d.v, d.dataIndex);
      if (data.length === 0) {
        return;
      }
      yScale.range([context.rowHeight(i), 0]);

      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.moveTo(xScale(0), yScale(data[0]));
      for (let i = 1; i < data.length; ++i) {
        ctx.lineTo(xScale(i), yScale(data[i]));
      }
      ctx.stroke();
    };
  }
}
