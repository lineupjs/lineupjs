import {hsl} from 'd3-color';
import {ICategoricalStatistics, IStatistics} from '../internal/math';
import {IDataRow, INumberColumn, isNumberColumn, isNumbersColumn} from '../model';
import Column from '../model/Column';
import {CANVAS_HEIGHT} from '../styles';
import {colorOf} from './impose';
import {default as IRenderContext, ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {noRenderer, setText} from './utils';

export function toHeatMapColor(row: IDataRow, col: INumberColumn & Column, imposer?: IImposer) {
  let v = col.getNumber(row);
  if (isNaN(v)) {
    v = 1; // max = brightest
  }
  //hsl space encoding, encode in lightness
  const color = hsl(colorOf(col, row, imposer) || Column.DEFAULT_COLOR);
  color.l = 1 - v; // largest value = darkest color
  return color.toString();
}

export default class HeatmapCellRenderer implements ICellRendererFactory {
  readonly title = 'Brightness';

  canRender(col: Column, isGroup: boolean) {
    return isNumberColumn(col) && !isGroup && !isNumbersColumn(col);
  }

  create(col: INumberColumn & Column, context: IRenderContext, _hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer) {
    const width = context.colWidth(col);
    return {
      template: `<div title="">
        <div style="background-color: ${col.color}"></div><div> </div>
      </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        n.title = col.getLabel(d);
        (<HTMLDivElement>n.firstElementChild!).style.backgroundColor = missing ? null : toHeatMapColor(d, col, imposer);
        setText(<HTMLSpanElement>n.lastElementChild!, n.title);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        ctx.fillStyle = toHeatMapColor(d, col, imposer);
        ctx.fillRect(0, 0, width, CANVAS_HEIGHT);
      }
    };
  }

  createGroup() {
    return noRenderer;
  }
}
