import ICellRendererFactory from './ICellRendererFactory';
import Column from '../model/Column';
import {INumberColumn, numberCompare} from '../model/NumberColumn';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr, clipText, setText} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {AAggregatedGroupRenderer} from './AAggregatedGroupRenderer';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class BarCellRenderer extends AAggregatedGroupRenderer<INumberColumn & Column> implements ICellRendererFactory {
  /**
   * flag to always render the value
   * @type {boolean}
   */

  constructor(private readonly renderValue: boolean = false, private colorOf: (d: any, i: number, col: Column) => string | null = (_d, _i, col) => col.color) {
    super();
  }

  createDOM(col: INumberColumn & Column): IDOMCellRenderer {
    return {
      template: `<div title="">
          <div style='background-color: ${col.color}'>
            <span ${this.renderValue ? '' : 'class="lu-hover-only"'}></span>
          </div>
        </div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        const value = col.getNumber(d.v, d.dataIndex);
        const w = isNaN(value) ? 0 : Math.round(value * 100 * 100) / 100;
        const title = col.getLabel(d.v, d.dataIndex);
        n.title = title;

        const bar = n.firstElementChild!;
        attr(<HTMLElement>bar, {
          title
        }, {
          width: `${w}%`,
          'background-color': this.colorOf(d.v, i, col)
        });
        setText(bar.firstElementChild!, title);
      }
    };
  }

  createCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const paddingTop = context.option('rowBarTopPadding', context.option('rowBarPadding', 1));
    const paddingBottom = context.option('rowBarBottomPadding', context.option('rowBarPadding', 1));
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      ctx.fillStyle = this.colorOf(d.v, i, col) || '';
      const width = context.colWidth(col) * col.getNumber(d.v, d.dataIndex);
      ctx.fillRect(0, paddingTop, isNaN(width) ? 0 : width, context.rowHeight(i) - (paddingTop + paddingBottom));
      if (this.renderValue || context.hovered(d.dataIndex) || context.selected(d.dataIndex)) {
        ctx.fillStyle = context.option('style.text', 'black');
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 1, 0, context.colWidth(col) - 1, context.textHints);
      }
    };
  }

  protected aggregatedIndex(rows: IDataRow[], col: INumberColumn & Column) {
    return medianIndex(rows, col);
  }
}

export function medianIndex(rows: IDataRow[], col: INumberColumn): number {
  //return the median row
  const sorted = rows.map((r, i) => ({i, v: col.getNumber(r.v, r.dataIndex)})).sort((a, b) => numberCompare(a.v, b.v));
  const index = sorted[Math.floor(sorted.length / 2.0)];
  if (index === undefined) {
    return 0; //error case
  }
  return index.i;
}
