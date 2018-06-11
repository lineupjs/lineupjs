import {hsl} from 'd3-color';
import {ICategoricalStatistics, IStatistics} from '../internal/math';
import {IDataRow, INumberColumn, isNumberColumn} from '../model';
import Column from '../model/Column';
import {isNumbersColumn} from '../model/INumberColumn';
import {CANVAS_HEIGHT} from '../styles';
import {colorOf} from './impose';
import {default as IRenderContext, ERenderMode, ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {noRenderer, setText} from './utils';

/** @internal */
export function toHeatMapColor(v: number | null, row: IDataRow, col: INumberColumn, imposer?: IImposer) {
  if (v == null || isNaN(v)) {
    v = 1; // max = brightest
  }
  //hsl space encoding, encode in lightness
  const color = hsl(colorOf(col, row, imposer) || Column.DEFAULT_COLOR);
  color.l = 1 - v; // largest value = darkest color
  return color.toString();
}

/** @internal */
export default class BrightnessCellRenderer implements ICellRendererFactory {
  readonly title = 'Brightness';

  canRender(col: Column, mode: ERenderMode) {
    return isNumberColumn(col) && mode === ERenderMode.CELL && !isNumbersColumn(col);
  }

  create(col: INumberColumn, context: IRenderContext, _hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer) {
    const width = context.colWidth(col);
    return {
      template: `<div title="">
        <div style="background-color: ${col.color}"></div><div> </div>
      </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        n.title = col.getLabel(d);
        (<HTMLDivElement>n.firstElementChild!).style.backgroundColor = missing ? null : toHeatMapColor(col.getNumber(d), d, col, imposer);
        setText(<HTMLSpanElement>n.lastElementChild!, n.title);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        ctx.fillStyle = toHeatMapColor(col.getNumber(d), d, col, imposer);
        ctx.fillRect(0, 0, width, CANVAS_HEIGHT);
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
