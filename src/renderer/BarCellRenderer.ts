import {ICategoricalStatistics, IStatistics} from '../internal';
import {IDataRow, INumberColumn, isNumberColumn} from '../model';
import Column from '../model/Column';
import {setText, adaptDynamicColorToBgColor, noRenderer} from './utils';
import {isNumbersColumn} from '../model';
import {CANVAS_HEIGHT} from '../styles';
import {colorOf} from './impose';
import {default as IRenderContext, ERenderMode, ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';


/** @internal */
export default class BarCellRenderer implements ICellRendererFactory {
  readonly title = 'Bar';

  /**
   * flag to always render the value
   * @type {boolean}
   */

  constructor(private readonly renderValue: boolean = false) {
  }

  canRender(col: Column, mode: ERenderMode) {
    return mode === ERenderMode.CELL && isNumberColumn(col) && !isNumbersColumn(col);
  }

  create(col: INumberColumn, context: IRenderContext, _hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer) {
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

        const bar = <HTMLElement>n.firstElementChild!;
        bar.style.width = missing ? '100%' : `${w}%`;
        const color = colorOf(col, d, imposer, value);
        bar.style.backgroundColor = missing ? null : color;
        setText(bar.firstElementChild!, title);
        const item = <HTMLElement>bar.firstElementChild!;
        setText(item, title);
        adaptDynamicColorToBgColor(item, color || Column.DEFAULT_COLOR, title, w / 100);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        const value = col.getNumber(d);
        ctx.fillStyle = colorOf(col, d, imposer, value) || Column.DEFAULT_COLOR;
        const w = width * value;
        ctx.fillRect(0, 0, isNaN(w) ? 0 : w, CANVAS_HEIGHT);

      }
    };
  }

  createGroup() {
    return noRenderer;
  }

  createSummary() {
    return noRenderer;
  }
}
