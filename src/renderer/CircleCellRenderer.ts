import ICellRendererFactory from './ICellRendererFactory';
import Column from '../model/Column';
import {INumberColumn} from '../model/NumberColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {IDataRow} from '../provider/ADataProvider';
import {attr, clipText, setText} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';

export default class CircleCellRenderer implements ICellRendererFactory {

  constructor(private colorOf: (d: any, i: number, col: Column) => string|null = (d, i, col) => col.color) {
  }

  createTODO(col: INumberColumn & Column, context: IDOMRenderContext) {
    return {
      template: `<div title="">
          <div style="width: 10px; height: 10px; background-color: ${col.color}"></div>
        </div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        setText(n, col.getLabel(d.v, d.dataIndex));
        const v = col.getNumber(d.v, d.dataIndex);
        const height = context.rowHeight(i);
        attr(<HTMLElement>n.firstElementChild!, {}, {
          width: `${height * v}px`,
          height: `${height * v}px`,
          'background-color': this.colorOf(d.v, d.dataIndex, col)!
        });
      }
    };
  }


  createCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const posy = (context.rowHeight(i) / 2);
      const posx = (col.getWidth() / 2);
      ctx.fillStyle = this.colorOf(d.v, i, col) || '';
      ctx.strokeStyle = this.colorOf(d.v, i, col) || '';
      ctx.beginPath();
      ctx.arc(posx, posy, (context.rowHeight(i) / 2) * col.getNumber(d.v, d.dataIndex), 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      if (context.hovered(d.dataIndex) || context.selected(d.dataIndex)) {
        ctx.fillStyle = context.option('style.text', 'black');
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 1, 0, col.getWidth() - 1, context.textHints);
      }
    };
  }
}
