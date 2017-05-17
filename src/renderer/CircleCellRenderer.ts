import ICellRendererFactory from './ICellRendererFactory';
import Column from '../model/Column';
import {INumberColumn} from '../model/NumberColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr, clipText} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';

export default class CircleCellRenderer implements ICellRendererFactory {

  constructor(private readonly renderValue: boolean = false, private colorOf: (d: any, i: number, col: Column) => string = (d, i, col) => col.color) {
    this.renderValue = renderValue;
  }

  createSVG(col: INumberColumn & Column, context: IDOMRenderContext): ISVGCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return {
      template: `<g class='bar'>
          <circle class='${col.cssClass}' style='fill: ${col.color}'>
            <title></title>
          </circle>
          <text class='number ${this.renderValue ? '' : 'hoverOnly'}' clip-path='url(#cp${context.idPrefix}clipCol${col.id})'></text>
        </g>`,
      update: (n: SVGElement, d: IDataRow, i: number) => {
        const v = col.getValue(d.v, d.dataIndex);
        attr(<SVGCircleElement>n.querySelector('circle'), {
          cy: (context.rowHeight(i) / 2),
          cx: (col.getWidth() / 2),
          r: (context.rowHeight(i) / 2) * v
        });
        attr(<SVGTextElement>n.querySelector('text'), {}).textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  }


  createCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const posy = (context.rowHeight(i) / 2);
      const posx = (col.getWidth() / 2);
      ctx.fillStyle = this.colorOf(d.v, i, col);
      ctx.strokeStyle = this.colorOf(d.v, i, col);
      ctx.beginPath();
      ctx.arc(posx, posy, (context.rowHeight(i) / 2) * col.getValue(d.v, d.dataIndex), 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      if (this.renderValue || context.hovered(d.dataIndex) || context.selected(d.dataIndex)) {
        ctx.fillStyle = context.option('style.text', 'black');
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 1, 0, col.getWidth() - 1, context.textHints);
      }
    };
  }
}
