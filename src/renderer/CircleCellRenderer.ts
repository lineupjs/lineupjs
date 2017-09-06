import ICellRendererFactory from './ICellRendererFactory';
import Column from '../model/Column';
import {INumberColumn} from '../model/NumberColumn';
import {ICanvasRenderContext} from './RendererContexts';
import {IDataRow} from '../provider/ADataProvider';
import {attr, clipText, setText} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import AAggregatedGroupRenderer from './AAggregatedGroupRenderer';
import {medianIndex, renderMissingValue} from './BarCellRenderer';

export default class CircleCellRenderer extends AAggregatedGroupRenderer<INumberColumn & Column> implements ICellRendererFactory {

  constructor(private colorOf: (d: any, i: number, col: Column) => string | null = (_d, _i, col) => col.color) {
    super();
  }

  createDOM(col: INumberColumn & Column) {
    return {
      template: `<div style="background: radial-gradient(circle closest-side, red 100%, transparent 100%)" title="">
              <div class="lu-hover-only"></div>
          </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const v = col.getNumber(d.v, d.dataIndex);
        const p = Math.round(v * 100);
        const missing = col.isMissing(d.v, d.dataIndex);
        n.classList.toggle('lu-missing', missing);
        attr(<HTMLElement>n, {}, {
          background: missing ? null : `radial-gradient(circle closest-side, ${this.colorOf(d.v, d.dataIndex, col)} ${p}%, transparent ${p}%)`
        },);
        setText(n.firstElementChild!, col.getLabel(d.v, d.dataIndex));
      }
    };
  }


  createCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (col.isMissing(d.v, d.dataIndex)) {
        renderMissingValue(ctx, col.getWidth(), context.rowHeight(i));
        return;
      }
      const value = col.getNumber(d.v, d.dataIndex);
      const posy = (context.rowHeight(i) / 2);
      const posx = (context.colWidth(col) / 2);
      ctx.fillStyle = this.colorOf(d.v, i, col) || '';
      ctx.strokeStyle = this.colorOf(d.v, i, col) || '';
      ctx.beginPath();
      ctx.arc(posx, posy, (context.rowHeight(i) / 2) * value, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      if (context.hovered(d.dataIndex) || context.selected(d.dataIndex)) {
        ctx.fillStyle = context.option('style.text', 'black');
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 1, 0, context.colWidth(col) - 1, context.textHints);
      }
    };
  }

  protected aggregatedIndex(rows: IDataRow[], col: INumberColumn & Column) {
    return medianIndex(rows, col);
  }
}
