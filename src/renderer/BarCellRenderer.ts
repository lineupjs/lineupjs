import {ICategoricalStatistics, IStatistics} from '../internal/math';
import {IDataRow, INumberColumn, isNumberColumn, isNumbersColumn} from '../model';
import Column from '../model/Column';
import {CANVAS_HEIGHT} from '../styles';
import {colorOf} from './impose';
import {default as IRenderContext, ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {attr, noRenderer, setText} from './utils';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class BarCellRenderer implements ICellRendererFactory {
  readonly title = 'Bar';

  /**
   * flag to always render the value
   * @type {boolean}
   */

  constructor(private readonly renderValue: boolean = false) {
  }

  canRender(col: Column, isGroup: boolean) {
    return isNumberColumn(col) && !isGroup && !isNumbersColumn(col);
  }

  create(col: INumberColumn & Column, context: IRenderContext, _hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer) {
    const width = context.colWidth(col);
    return {
      template: `<div title="">
          <div style='background-color: ${col.color}'>
            <span ${this.renderValue ? '' : 'class="lu-hover-only"'}></span>
          </div>
        </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        const value = col.getNumber(d);
        const missing = renderMissingDOM(n, col, d);
        const w = isNaN(value) ? 0 : Math.round(value * 100 * 100) / 100;
        const title = col.getLabel(d);
        n.title = title;

        const bar = n.firstElementChild!;
        attr(<HTMLElement>bar, {
          title
        }, {
          width: missing ? '100%' : `${w}%`,
          'background-color': missing ? null : colorOf(col, d, imposer)
        });
        setText(bar.firstElementChild!, title);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        ctx.fillStyle = colorOf(col, d, imposer) || Column.DEFAULT_COLOR;
        const w = width * col.getNumber(d);
        ctx.fillRect(0, 0, isNaN(w) ? 0 : w, CANVAS_HEIGHT);

      }
    };
  }

  createGroup() {
    return noRenderer;
  }
}
