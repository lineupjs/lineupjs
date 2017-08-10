import ICellRendererFactory from './ICellRendererFactory';
import {INumbersColumn} from '../model/NumbersColumn';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import Column from '../model/Column';

function line(data: number[]) {
  if (data.length === 0) {
    return '';
  }
  const first = data[0];
  return `M0,${1-first} ${data.slice(1).map((d,i) => `L${i},${1-d}`).join(' ')}`;
}

export default class SparklineCellRenderer implements ICellRendererFactory {

  createDOM(col: INumbersColumn & Column): IDOMCellRenderer {
    return {
      template: `<svg viewBox="0 0 ${col.getDataLength()} 1" preserveAspectRatio="meet"><path></path></svg>`,
      update: (n: HTMLElement, d: IDataRow) => {
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
      ctx.scale(context.colWidth(col) / col.getDataLength(), context.rowHeight(i));
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
