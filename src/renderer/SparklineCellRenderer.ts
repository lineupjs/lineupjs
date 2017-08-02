import ICellRendererFactory from './ICellRendererFactory';
import {INumbersColumn} from '../model/NumbersColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {svg as d3svg} from 'd3';
import Column from '../model/Column';

const line = d3svg.line<number>().x((d, j) => j).y((d) => 1 - d).interpolate('linear');

export default class SparklineCellRenderer implements ICellRendererFactory {

  createDOM(col: INumbersColumn & Column, context: IDOMRenderContext): IDOMCellRenderer {
    return {
      template: `<svg viewBox="0 0 ${col.getDataLength()} 1" preserveAspectRatio="meet"><path></path></svg>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        n.firstElementChild!.setAttribute('d', line(col.getNumbers(d.v, d.dataIndex)));
      }
    };
  }

  createCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const data = col.getNumbers(d.v, d.dataIndex);
      if (data.length === 0) {
        return;
      }
      ctx.save();
      ctx.scale(col.getActualWidth() / col.getDataLength(), context.rowHeight(i));
      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.moveTo(0, 1 - data[0]);
      for (let i = 1; i < data.length; ++i) {
        ctx.lineTo(i, 1 - data[i]);
      }
      ctx.stroke();
      ctx.restore();
    };
  }
}
