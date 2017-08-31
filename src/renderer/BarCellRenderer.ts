import ICellRendererFactory from './ICellRendererFactory';
import Column from '../model/Column';
import {INumberColumn, isMissingValue} from '../model/NumberColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer, IHTMLCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr, clipText} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import * as hatching from '../assets/hatching.png';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class BarCellRenderer implements ICellRendererFactory {
  /**
   * flag to always render the value
   * @type {boolean}
   */

  constructor(private readonly renderValue: boolean = false, private colorOf: (d: any, i: number, col: Column) => string = (d, i, col) => col.color) {}

  createSVG(col: INumberColumn & Column, context: IDOMRenderContext): ISVGCellRenderer {
    const paddingTop = context.option('rowBarTopPadding', context.option('rowBarPadding', 1));
    const paddingBottom = context.option('rowBarBottomPadding', context.option('rowBarPadding', 1));
    return {
      template: `<g class='bar'>
          <rect class='${col.cssClass}' y='${paddingTop}' style='fill: ${col.color}'>
            <title></title>
          </rect>
          <text class='number ${this.renderValue ? '' : 'hoverOnly'}' clip-path='url(#cp${context.idPrefix}clipCol${col.id})'></text>
        </g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {

        if (col.isMissing(d.v, d.dataIndex)) {
          // missing
          n.classList.add('lu-missing');
          attr(<SVGRectElement>n.querySelector('rect'), {
            y: paddingTop,
            width: col.getWidth(),
            height: context.rowHeight(i) - (paddingTop + paddingBottom)
          }, {
            fill: null
          });
          attr(<SVGTextElement>n.querySelector('text'), {}).textContent = 'NaN';
          return;
        }
        n.classList.remove('lu-missing');

        const width = col.getWidth() * col.getValue(d.v, d.dataIndex);
        n.querySelector('rect title').textContent = col.getLabel(d.v, d.dataIndex);

        attr(<SVGRectElement>n.querySelector('rect'), {
          y: paddingTop,
          width: isNaN(width) ? 0 : width,
          height: context.rowHeight(i) - (paddingTop + paddingBottom)
        }, {
          fill: this.colorOf(d.v, i, col)
        });
        attr(<SVGTextElement>n.querySelector('text'), {}).textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createHTML(col: INumberColumn & Column, context: IDOMRenderContext): IHTMLCellRenderer {
    const paddingTop = context.option('rowBarTopPadding', context.option('rowBarPadding', 1));
    const paddingBottom = context.option('rowBarBottomPadding', context.option('rowBarPadding', 1));
    return {
      template: `<div class='bar' style='top:${paddingTop}px; background-color: ${col.color}'>
          <span class='number ${this.renderValue ? '' : 'hoverOnly'}'></span>
        </div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {

        if (col.isMissing(d.v, d.dataIndex)) {
          // missing
          n.classList.add('lu-missing');
          attr(n, {
           title: 'NaN'
          }, {
            width: `${col.getWidth()}px`,
            height: `${context.rowHeight(i) - (paddingTop + paddingBottom)}px`,
            top: `${paddingTop}px`,
            'background-color': null
          });
          n.querySelector('span').textContent = 'NaN';
          return;
        }
        n.classList.remove('lu-missing');

        const width = col.getWidth() * col.getValue(d.v, d.dataIndex);
        attr(n, {
          title: col.getLabel(d.v, d.dataIndex)
        }, {
          width: `${isNaN(width) ? 0 : width}px`,
          height: `${context.rowHeight(i) - (paddingTop + paddingBottom)}px`,
          top: `${paddingTop}px`,
          'background-color': this.colorOf(d.v, i, col)
        });
        n.querySelector('span').textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const paddingTop = context.option('rowBarTopPadding', context.option('rowBarPadding', 1));
    const paddingBottom = context.option('rowBarBottomPadding', context.option('rowBarPadding', 1));
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (col.isMissing(d.v, d.dataIndex)) {
        renderMissingValue(ctx, col.getWidth(), context.rowHeight(i));
        return;
      }
      const width = col.getWidth() * col.getValue(d.v, d.dataIndex);
      ctx.fillStyle = this.colorOf(d.v, i, col);
      ctx.fillRect(0, paddingTop, isNaN(width) ? 0 : width, context.rowHeight(i) - (paddingTop + paddingBottom));
      if (this.renderValue || context.hovered(d.dataIndex) || context.selected(d.dataIndex)) {
        ctx.fillStyle = context.option('style.text', 'black');
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 1, 0, col.getWidth() - 1, context.textHints);
      }
    };
  }
}


export function renderMissingValue(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // create a hatching pattern over the full width

  const missingImage = new Image();
  missingImage.src = hatching;
  ctx.fillStyle = ctx.createPattern(missingImage, 'repeat');
  ctx.fillRect(0, 0, width, height);
}
