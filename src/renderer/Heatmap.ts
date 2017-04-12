import {INumberColumn} from '../model/NumberColumn';
import Column from '../model/Column';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer, IHTMLCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {hsl} from 'd3';
import ICellRendererFactory from './ICellRendererFactory';


export default class Heatmap implements ICellRendererFactory {
  private static toHeatMapColor(d: any, index: number, col: INumberColumn & Column) {
    let v = col.getNumber(d, index);
    if (isNaN(v)) {
      v = 0;
    }
    //hsl space encoding, encode in lightness
    const color = hsl(col.color || Column.DEFAULT_COLOR);
    color.l = v;
    return color.toString();
  }

  createSVG(col: INumberColumn & Column, context: IDOMRenderContext): ISVGCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return {
      template: `<rect class='heatmap ${col.cssClass}' y='${padding}' style='fill: ${col.color}'>
            <title></title>
          </rect>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        n.querySelector('title').textContent = col.getLabel(d.v, d.dataIndex);
        const w = context.rowHeight(i) - padding * 2;

        attr(n, {
          y: padding,
          width: w,
          height: w
        }, {
          fill: Heatmap.toHeatMapColor(d.v, d.dataIndex, col)
        });
      }
    };
  }

  createHTML(col: INumberColumn & Column, context: IDOMRenderContext): IHTMLCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return {
      template: `<div class='heatmap ${col.cssClass}' style='background-color: ${col.color}; top: ${padding}'></div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        const w = context.rowHeight(i) - padding * 2;
        attr(n, {
          title: col.getLabel(d.v, d.dataIndex)
        }, {
          width: `${w}px`,
          height: `${w}px`,
          top: `${padding}px`,
          'background-color': Heatmap.toHeatMapColor(d.v, d.dataIndex, col)
        });
      }
    };
  }

  createCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const w = context.rowHeight(i) - padding * 2;
      ctx.fillStyle = Heatmap.toHeatMapColor(d.v, d.dataIndex, col);
      ctx.fillRect(padding, padding, w, w);
    };
  }
}
